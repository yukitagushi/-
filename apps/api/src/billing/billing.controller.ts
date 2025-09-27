import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res
} from "@nestjs/common";
import { Response } from "express";
import { BillingService } from "./billing.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { ListInvoiceDto } from "./dto/list-invoice.dto";
import { AuditService } from "../audit/audit.service";

@Controller("billing/invoices")
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly audit: AuditService
  ) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.create(dto);
  }

  @Get()
  list(@Query() query: ListInvoiceDto) {
    return this.billingService.list(query);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingService.update(id, dto);
  }

  @Get(".csv")
  async downloadCsv(@Query() query: ListInvoiceDto, @Res() res: Response) {
    const invoices = await this.billingService.listCsv(query);
    const header = ["invoice_id", "customer_name", "period_from", "period_to", "amount_jpy", "status", "updated_at"];
    const rows = invoices.map((item) => [
      item.invoiceId,
      item.customerName,
      item.periodFrom,
      item.periodTo,
      String(item.amountJpy),
      item.status,
      item.updatedAt
    ]);

    const csv = [header, ...rows]
      .map((fields) => fields.map(wrapCsv).join(","))
      .join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=invoice_export.csv");
    res.send(csv);

    await this.audit.record({
      action: "billing.csv",
      detail: `count=${invoices.length}`
    });
  }
}

function escapeCsv(value: string | null | undefined) {
  if (value === null || value === undefined) return "";
  return value;
}

function wrapCsv(value: string | null | undefined) {
  const safe = value === null || value === undefined ? "" : String(value);
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}
