import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { InvoiceStatus } from "@prisma/client";

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsDateString()
  periodFrom!: string;

  @IsDateString()
  periodTo!: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  amountJpy!: number;

  @IsString()
  @IsOptional()
  memo?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
