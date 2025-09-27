import { Injectable, NotFoundException } from "@nestjs/common";
import { Invoice, InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";

type InvoiceResponse = {
  invoiceId: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  amountJpy: number;
  memo?: string | null;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(dto: CreateInvoiceDto): Promise<InvoiceResponse> {
    const created = await this.prisma.invoice.create({
      data: {
        tenantId: this.prisma.getTenantId(),
        customerName: dto.customerName,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        amountJpy: dto.amountJpy,
        memo: dto.memo,
        status: dto.status ?? "draft"
      }
    });

    await this.audit.record({
      action: "billing.create",
      targetId: created.invoiceId,
      detail: `status=${created.status} amount=${created.amountJpy}`
    });

    return this.toResponse(created);
  }

  async list(params: { status?: InvoiceStatus; q?: string; limit?: number }) {
    const where: any = { tenantId: this.prisma.getTenantId() };
    if (params.status) where.status = params.status;
    if (params.q) {
      where.customerName = { contains: params.q, mode: "insensitive" };
    }

    const limit = params.limit ?? 100;
    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return invoices.map((invoice) => this.toResponse(invoice));
  }

  async update(invoiceId: string, dto: UpdateInvoiceDto): Promise<InvoiceResponse> {
    const existing = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId: this.prisma.getTenantId() }
    });
    if (!existing) {
      throw new NotFoundException("請求書が見つかりません");
    }

    const updated = await this.prisma.invoice.update({
      where: { invoiceId },
      data: {
        customerName: dto.customerName ?? existing.customerName,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : existing.periodFrom,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : existing.periodTo,
        amountJpy: dto.amountJpy ?? existing.amountJpy,
        memo: dto.memo ?? existing.memo,
        status: dto.status ?? existing.status
      }
    });

    await this.audit.record({
      action: "billing.update",
      targetId: invoiceId,
      detail: `status=${updated.status} amount=${updated.amountJpy}`
    });

    return this.toResponse(updated);
  }

  async findOneOrThrow(invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId: this.prisma.getTenantId() }
    });
    if (!invoice) {
      throw new NotFoundException("請求書が見つかりません");
    }
    return invoice;
  }

  async listCsv(params: { status?: InvoiceStatus; q?: string }) {
    const invoices = await this.list({ ...params, limit: 500 });
    return invoices;
  }

  private toResponse(invoice: Invoice): InvoiceResponse {
    return {
      invoiceId: invoice.invoiceId,
      customerName: invoice.customerName,
      periodFrom: invoice.periodFrom.toISOString().slice(0, 10),
      periodTo: invoice.periodTo.toISOString().slice(0, 10),
      amountJpy: invoice.amountJpy,
      memo: invoice.memo,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString()
    };
  }
}
