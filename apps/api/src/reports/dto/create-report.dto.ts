import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

const CATEGORIES = ["コンプライアンス違反", "ハラスメント", "労働環境", "その他"] as const;

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  title!: string;

  @IsString()
  @IsOptional()
  @IsIn([...CATEGORIES])
  category?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  body!: string;
}
