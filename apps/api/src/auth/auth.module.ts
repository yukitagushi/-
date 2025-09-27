import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SessionService } from "./session.service";

@Module({
  imports: [AuditModule, NotificationsModule],
  providers: [AuthService, SessionService],
  controllers: [AuthController],
  exports: [SessionService]
})
export class AuthModule {}
