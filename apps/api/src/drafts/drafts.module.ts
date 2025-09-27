import { Module } from "@nestjs/common";
import { DraftsService } from "./drafts.service";
import { DraftsController } from "./drafts.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [DraftsService],
  controllers: [DraftsController]
})
export class DraftsModule {}
