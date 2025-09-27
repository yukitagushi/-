import { Body, Controller, Post } from "@nestjs/common";
import { FilesService } from "./files.service";
import { PresignRequestDto } from "./dto/presign.dto";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("presign")
  presign(@Body() dto: PresignRequestDto) {
    return this.filesService.createPresignedUrl(dto);
  }
}
