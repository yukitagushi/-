import { Injectable, Logger } from "@nestjs/common";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { createTransport, Transporter } from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient = this.buildSesClient();
  private smtpTransport?: Transporter;

  private buildSesClient() {
    const region = process.env.SES_REGION;
    if (!region) return null;
    return new SESClient({ region });
  }

  private get mailMode(): string {
    return (process.env.OTP_MAIL_MODE || "dryrun").toLowerCase();
  }

  private get fromAddress(): string {
    return process.env.NOTIFY_MAIL_FROM || "no-reply@silentvoice.local";
  }

  private ensureSmtpTransport(): Transporter | null {
    if (this.smtpTransport) return this.smtpTransport;
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.smtpTransport = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined
    });
    return this.smtpTransport;
  }

  async sendOtp(email: string, code: string) {
    await this.send({
      to: email,
      subject: "サイレントボイス ワンタイムパスコード",
      text: `ログインコード: ${code}\n10分以内に入力してください。`
    });
  }

  async notifyReport(subject: string, body: string) {
    const to = process.env.NOTIFY_MAIL_TO;
    if (!to) {
      this.logger.debug(`通知メール先が未設定のため送信をスキップしました: ${subject}`);
      return;
    }
    await this.send({ to, subject, text: body });
  }

  private async send(payload: MailPayload) {
    const mode = this.mailMode;
    if (mode === "ses" && this.sesClient) {
      await this.sendViaSes(payload);
      return;
    }
    if (mode === "smtp") {
      const transport = this.ensureSmtpTransport();
      if (transport) {
        await transport.sendMail({
          from: this.fromAddress,
          to: payload.to,
          subject: payload.subject,
          text: payload.text
        });
        return;
      }
      this.logger.warn("SMTP設定が不足しているためドライラン送信に切り替えます");
    }

    this.logger.log(`DryRun mail to ${payload.to}: ${payload.subject}\n${payload.text}`);
  }

  private async sendViaSes(payload: MailPayload) {
    if (!process.env.NOTIFY_MAIL_FROM) {
      this.logger.warn("SES送信元アドレスが未設定のためドライラン送信に切り替えます");
      this.logger.log(`DryRun mail to ${payload.to}: ${payload.subject}`);
      return;
    }

    const cmd = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: { ToAddresses: [payload.to] },
      Message: {
        Subject: { Data: payload.subject },
        Body: {
          Text: { Data: payload.text }
        }
      }
    });

    await this.sesClient!.send(cmd);
  }
}
