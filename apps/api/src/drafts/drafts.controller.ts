import { Body, Controller, Post } from "@nestjs/common";
import { DraftsService } from "./drafts.service";
import { CreateDraftDto } from "./dto/create-draft.dto";

@Controller("drafts")
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  create(@Body() dto: CreateDraftDto) {
    return this.draftsService.createDraft(dto);
  }
}
