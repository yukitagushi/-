import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { SnsService } from "./sns.service";

@Global()
@Module({
  providers: [EmailService, SnsService],
  exports: [EmailService, SnsService]
})
export class NotificationsModule {}
