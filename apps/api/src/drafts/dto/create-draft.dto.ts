import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;
}
