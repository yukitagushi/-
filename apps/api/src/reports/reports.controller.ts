import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { ReportStatus } from "@prisma/client";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("category") category?: string
  ) {
    const statusEnum = status && this.isValidStatus(status) ? (status as ReportStatus) : undefined;
    const categoryFilter = category && category !== "all" ? category : undefined;
    return this.reportsService.list({ status: statusEnum, category: categoryFilter });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.reportsService.remove(id);
  }

  private isValidStatus(status: string): status is ReportStatus {
    return ["受付", "調査", "対応中", "完了"].includes(status);
  }
}
