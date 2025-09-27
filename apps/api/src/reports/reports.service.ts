import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Report, ReportStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";

type ReportResponse = {
  reportId: string;
  title: string;
  category?: string | null;
  body: string;
  status: ReportStatus;
  riskScore: number;
  assigneeName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService
  ) {}

  async create(dto: CreateReportDto): Promise<ReportResponse> {
    const created = await this.prisma.report.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        title: dto.title,
        category: dto.category,
        bodyEncrypted: this.encrypt(dto.body)
      }
    });

    await this.audit.record({
      action: "report.create",
      detail: `category=${dto.category ?? ""}`,
      targetId: created.reportId,
      reportId: created.reportId
    });

    await this.emailService.notifyReport(
      `[Silent Voice] 新規通報: ${dto.title}`,
      dto.body
    );

    return this.toResponse(created);
  }

  async list(filter?: { status?: ReportStatus; category?: string }) {
    const where: Prisma.ReportWhereInput = {
      tenantId: this.prisma.getTenantId()
    };
    if (filter?.status) where.status = filter.status;
    if (filter?.category) where.category = filter.category;

    const reports = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return reports.map((report) => this.toResponse(report));
  }

  async findOne(reportId: string): Promise<ReportResponse> {
    const report = await this.prisma.report.findFirst({
      where: {
        reportId,
        tenantId: this.prisma.getTenantId()
      }
    });
    if (!report) {
      throw new NotFoundException("通報が見つかりません");
    }
    return this.toResponse(report);
  }

  async update(reportId: string, dto: UpdateReportDto): Promise<ReportResponse> {
    const existing = await this.prisma.report.findFirst({
      where: { reportId, tenantId: this.prisma.getTenantId() }
    });
    if (!existing) {
      throw new NotFoundException("通報が見つかりません");
    }

    const updated = await this.prisma.report.update({
      where: { reportId },
      data: {
        title: dto.title ?? existing.title,
        bodyEncrypted: dto.body ? this.encrypt(dto.body) : existing.bodyEncrypted,
        status: dto.status ?? existing.status,
        riskScore:
          dto.riskScore !== undefined
            ? Math.min(Math.max(dto.riskScore, 0), 100)
            : existing.riskScore,
        assigneeName:
          dto.assigneeName !== undefined
            ? dto.assigneeName.trim() || null
            : existing.assigneeName
      }
    });

    await this.audit.record({
      action: "report.update",
      targetId: reportId,
      detail: `status=${updated.status} risk=${updated.riskScore} assignee=${updated.assigneeName ?? ""}`,
      reportId: reportId
    });

    return this.toResponse(updated);
  }

  async remove(reportId: string) {
    const existing = await this.prisma.report.findFirst({
      where: { reportId, tenantId: this.prisma.getTenantId() }
    });
    if (!existing) {
      throw new NotFoundException("通報が見つかりません");
    }

    await this.prisma.report.delete({ where: { reportId } });
    await this.audit.record({ action: "report.delete", targetId: reportId, reportId });
    return { ok: true };
  }

  private toResponse(entity: Report): ReportResponse {
    return {
      reportId: entity.reportId,
      title: entity.title,
      category: entity.category,
      body: this.decrypt(entity.bodyEncrypted),
      status: entity.status,
      riskScore: entity.riskScore,
      assigneeName: entity.assigneeName,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  private encrypt(plain: string) {
    return Buffer.from(plain, "utf8").toString("base64");
  }

  private decrypt(encoded: string) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
}
