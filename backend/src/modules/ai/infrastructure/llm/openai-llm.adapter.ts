import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AI_CONFIG_RESOLVER, type AiConfigResolver } from '../../domain/ports/ai-config-resolver';
import type { LlmMessage, LlmPort, LlmRequest } from '../../domain/ports/llm-port';
import { TokenUsageService, type RawUsage } from '../../../../token-usage/token-usage.service';

// Minimal slice of the OpenAI chat API this adapter relies on — keeps the SDK's
// surface from leaking and makes the adapter testable via createClient().
export interface ChatParams {
  model: string;
  temperature: number;
  response_format: { type: 'json_object' };
  messages: LlmMessage[];
  max_tokens?: number;
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

const DEFAULT_TEMPERATURE = 0.3;

// ACL over OpenAI: resolves the user's config (key/baseUrl/model) and runs a
// JSON-object chat completion. The only place that imports the OpenAI SDK.
@Injectable()
export class OpenAiLlmAdapter implements LlmPort {
  constructor(
    @Inject(AI_CONFIG_RESOLVER) private readonly config: AiConfigResolver,
    private readonly tokens?: TokenUsageService,
  ) {}

  async complete(request: LlmRequest): Promise<string> {
    const cfg = await this.config.resolve(request.userId);
    if (!cfg.apiKey)
      throw new BadRequestException('API key não configurada. Configure em Configurações.');
    const client = this.createClient({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
    const response = await client.chat.completions.create({
      model: cfg.model,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: request.messages,
      ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
    });
    this.tokens?.record(request.userId, response.usage);
    return response.choices[0]?.message?.content ?? '';
  }

  // Seam for tests; production builds a real OpenAI client.
  protected createClient(config: { apiKey: string; baseURL: string }): ChatClient {
    return new OpenAI(config) as unknown as ChatClient;
  }
}
