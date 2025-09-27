import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { AuditService } from "../audit/audit.service";
import { CreateDraftDto } from "./dto/create-draft.dto";

@Injectable()
export class DraftsService {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly audit: AuditService) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    this.model = process.env.OPENAI_MODEL || "gpt-4o";
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async createDraft(dto: CreateDraftDto) {
    const prompt = this.buildPrompt(dto);

    if (!this.client) {
      const fallback = this.buildFallback(dto);
      await this.audit.record({
        action: "draft.create",
        detail: "mode=dryrun",
        targetId: dto.title.slice(0, 60)
      });
      return { draft: fallback, mode: "dryrun" };
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: prompt
      });
      const draft = response.output_text?.trim() || this.buildFallback(dto);

      await this.audit.record({
        action: "draft.create",
        detail: `mode=live model=${this.model}`,
        targetId: dto.title.slice(0, 60)
      });

      return { draft, mode: "live" };
    } catch (error) {
      await this.audit.record({
        action: "draft.create.error",
        detail: String(error),
        targetId: dto.title.slice(0, 60)
      });
      return { draft: this.buildFallback(dto), mode: "error" };
    }
  }

  private buildPrompt(dto: CreateDraftDto) {
    return `You are an internal compliance assistant helping draft responses to whistleblower reports. Summarize the following report in Japanese, include risk indicators (low/medium/high) and first response steps. Keep within 250 Japanese characters.\n\n件名: ${dto.title}\n本文: ${dto.body}`;
  }

  private buildFallback(dto: CreateDraftDto) {
    const snippet = dto.body.slice(0, 120).replace(/\s+/g, " ");
    return `【ドラフト(サンプル)】\n件名: ${dto.title}\n要約: ${snippet}...\n初動: 受領しました。詳細を確認し、担当部署へ連携してください。`;
  }
}
