import { describe, it, expect } from 'vitest';
import { EndSessionUseCase } from './end-session.use-case';
import type {
  StudySessionLifecycle,
  StudySessionSummary,
} from '../../domain/ports/study-session-lifecycle';

class FakeLifecycle implements StudySessionLifecycle {
  ended: Array<[string, string]> = [];
  deleted: string[] = [];
  summary: StudySessionSummary | null = null;
  async findSummary(): Promise<StudySessionSummary | null> {
    return this.summary;
  }
  async end(userId: string, sessionId: string): Promise<void> {
    this.ended.push([userId, sessionId]);
  }
  async delete(id: string): Promise<void> {
    this.deleted.push(id);
  }
}

describe('EndSessionUseCase', () => {
  it('marks the session as ended', async () => {
    const sessions = new FakeLifecycle();
    const res = await new EndSessionUseCase(sessions).execute('u1', 'sess-1');
    expect(res).toEqual({ success: true });
    expect(sessions.ended).toEqual([['u1', 'sess-1']]);
  });
});
