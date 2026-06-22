import { describe, it, expect, beforeEach } from 'vitest';
import { FinalizeSessionUseCase } from './finalize-session.use-case';
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

describe('FinalizeSessionUseCase', () => {
  let sessions: FakeLifecycle;
  let useCase: FinalizeSessionUseCase;

  beforeEach(() => {
    sessions = new FakeLifecycle();
    useCase = new FinalizeSessionUseCase(sessions);
  });

  it('returns success=false when the session does not exist', async () => {
    sessions.summary = null;
    const res = await useCase.execute('u1', 'missing');
    expect(res).toEqual({ success: false });
    expect(sessions.deleted).toHaveLength(0);
    expect(sessions.ended).toHaveLength(0);
  });

  it('discards a session that recorded no reviews', async () => {
    sessions.summary = { id: 'sess-1', endedAt: null, reviewCount: 0 };
    const res = await useCase.execute('u1', 'sess-1');
    expect(res).toEqual({ success: true });
    expect(sessions.deleted).toEqual(['sess-1']);
    expect(sessions.ended).toHaveLength(0);
  });

  it('ends a session that recorded reviews and was not yet ended', async () => {
    sessions.summary = { id: 'sess-1', endedAt: null, reviewCount: 3 };
    await useCase.execute('u1', 'sess-1');
    expect(sessions.ended).toEqual([['u1', 'sess-1']]);
    expect(sessions.deleted).toHaveLength(0);
  });

  it('leaves an already-ended session untouched', async () => {
    sessions.summary = { id: 'sess-1', endedAt: new Date(), reviewCount: 3 };
    const res = await useCase.execute('u1', 'sess-1');
    expect(res).toEqual({ success: true });
    expect(sessions.ended).toHaveLength(0);
    expect(sessions.deleted).toHaveLength(0);
  });
});
