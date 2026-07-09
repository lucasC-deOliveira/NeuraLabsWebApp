import { Injectable } from '@nestjs/common';

export interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface TokenUsageTotals {
  prompt: number;
  completion: number;
  total: number;
  calls: number;
}

// In-memory, per-user running total of LLM tokens spent since process start.
// Recorded at the LLM adapter chokepoint, so every AI feature is covered without
// instrumenting each use-case. Not persisted — it is a live monitor, reset on
// backend restart.
@Injectable()
export class TokenUsageService {
  private readonly byUser = new Map<string, TokenUsageTotals>();

  record(userId: string, usage: RawUsage | undefined): void {
    const prompt = usage?.prompt_tokens ?? 0;
    const completion = usage?.completion_tokens ?? 0;
    const current = this.byUser.get(userId) ?? empty();
    this.byUser.set(userId, {
      prompt: current.prompt + prompt,
      completion: current.completion + completion,
      total: current.total + (usage?.total_tokens ?? prompt + completion),
      calls: current.calls + 1,
    });
  }

  get(userId: string): TokenUsageTotals {
    return this.byUser.get(userId) ?? empty();
  }

  reset(userId: string): void {
    this.byUser.delete(userId);
  }
}

const empty = (): TokenUsageTotals => ({ prompt: 0, completion: 0, total: 0, calls: 0 });
