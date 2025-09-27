import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type AuditRecordInput = {
  action: string;
  detail?: string;
  targetId?: string | null;
  actorId?: string | null;
  reportId?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(limit = 200) {
    return this.prisma.auditLog.findMany({
      where: { tenantId: this.prisma.getTenantId() },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }

  async record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        action: input.action,
        detail: input.detail,
        targetId: input.targetId,
        actorId: input.actorId,
        reportId: input.reportId
      }
    });
  }
}
