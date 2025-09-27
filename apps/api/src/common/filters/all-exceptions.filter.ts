import { ArgumentsHost, Catch, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { SnsService } from "../../notifications/sns.service";

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(private readonly snsService: SnsService) {
    super();
  }

  override async catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const message = exception instanceof Error ? exception.stack || exception.message : String(exception);
      await this.snsService.publish("silent-voice-api-error", message.slice(0, 1900));
    }

    super.catch(exception, host);
  }
}
