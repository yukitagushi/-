import { InvoiceStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListInvoiceDto {
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsString()
  @IsOptional()
  q?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}
