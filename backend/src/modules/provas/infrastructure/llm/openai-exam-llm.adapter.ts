import { BadRequestException, Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ResolveAiConfigUseCase } from '../../../settings/application/use-cases/resolve-ai-config.use-case';
import type { ExamLlmMessage, ExamLlmPort, ExamLlmRequest } from '../../domain/ports/exam-llm';
import { TokenUsageService, type RawUsage } from '../../../../token-usage/token-usage.service';

// Minimal slice of the OpenAI chat API this adapter relies on — keeps the SDK's
// surface from leaking and makes the adapter testable via createClient().
export interface ChatParams {
  model: string;
  temperature: number;
  response_format: { type: 'json_object' };
  messages: ExamLlmMessage[];
}
export interface ChatClient {
  chat: {
    completions: {
      create(params: ChatParams): Promise<{
        choices: Array<{ message: { content: string | null } | null }>;
        usage?: RawUsage;
      }>;
    };
  };
}

const DEFAULT_TEMPERATURE = 0.1;

// ACL over OpenAI for exam parsing: resolves the user's config (key/baseUrl/model)
// and runs a JSON-object chat completion. The only place that imports the SDK.
@Injectable()
export class OpenAiExamLlmAdapter implements ExamLlmPort {
  constructor(
    private readonly resolveConfig: ResolveAiConfigUseCase,
    private readonly tokens?: TokenUsageService,
  ) {}

  async complete(request: ExamLlmRequest): Promise<string> {
    const cfg = await this.resolveConfig.execute(request.userId);
    if (!cfg.apiKey)
      throw new BadRequestException('API key não configurada. Configure em Configurações.');
    const client = this.createClient({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
    const response = await client.chat.completions.create({
      model: cfg.model,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: request.messages,
    });
    this.tokens?.record(request.userId, response.usage);
    return response.choices[0]?.message?.content ?? '';
  }

  // Seam for tests; production builds a real OpenAI client.
  protected createClient(config: { apiKey: string; baseURL: string }): ChatClient {
    return new OpenAI(config) as unknown as ChatClient;
  }
}
