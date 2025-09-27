import { ReportStatus } from "@prisma/client";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const STATUSES: ReportStatus[] = ["受付", "調査", "対応中", "完了"];

export class UpdateReportDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  assigneeName?: string;

  @IsString()
  @IsOptional()
  @IsIn(STATUSES)
  status?: ReportStatus;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  riskScore?: number;
}
