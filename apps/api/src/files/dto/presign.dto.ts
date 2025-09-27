import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class PresignRequestDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsUUID()
  @IsOptional()
  reportId?: string;
}
