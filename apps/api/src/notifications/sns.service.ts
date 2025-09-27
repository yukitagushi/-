import { Injectable, Logger } from "@nestjs/common";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

@Injectable()
export class SnsService {
  private readonly logger = new Logger(SnsService.name);
  private readonly client: SNSClient | null;
  private readonly topicArn?: string;
  private readonly enabled: boolean;

  constructor() {
    this.topicArn = process.env.SNS_TOPIC_ARN || undefined;
    this.enabled = (process.env.ENABLE_SNS_ALERTS || "false").toLowerCase() === "true" && !!this.topicArn;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (this.enabled && region) {
      this.client = new SNSClient({
        region,
        credentials:
          accessKeyId && secretAccessKey
            ? {
                accessKeyId,
                secretAccessKey
              }
            : undefined
      });
    } else {
      this.client = null;
    }
  }

  async publish(subject: string, message: string) {
    if (!this.enabled || !this.client || !this.topicArn) {
      this.logger.debug(`SNS skipped: ${subject}`);
      return;
    }

    try {
      await this.client.send(
        new PublishCommand({
          TopicArn: this.topicArn,
          Subject: subject.slice(0, 99),
          Message: message
        })
      );
    } catch (error) {
      this.logger.warn(`SNS publish failed: ${error}`);
    }
  }
}
