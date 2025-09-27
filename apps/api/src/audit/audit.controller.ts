import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    const size = limit ? Math.min(Number(limit) || 200, 500) : 200;
    return this.auditService.list(size);
  }

  @Post()
  record(
    @Body()
    body: { action: string; detail?: string; targetId?: string; actorId?: string; reportId?: string }
  ) {
    return this.auditService.record({
      action: body.action,
      detail: body.detail,
      targetId: body.targetId,
      actorId: body.actorId,
      reportId: body.reportId
    });
  }
}
