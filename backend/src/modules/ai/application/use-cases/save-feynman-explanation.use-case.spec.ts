import { describe, it, expect } from 'vitest';
import { SaveFeynmanExplanationUseCase } from './save-feynman-explanation.use-case';
import type {
  FeynmanAttemptInput,
  FeynmanStateInput,
  FeynmanStore,
} from '../../domain/ports/feynman-store';

class FakeStore implements FeynmanStore {
  public attempt: FeynmanAttemptInput | null = null;
  public state: FeynmanStateInput | null = null;
  constructor(private readonly interval: number) {}
  saveAttempt(input: FeynmanAttemptInput): Promise<void> {
    this.attempt = input;
    return Promise.resolve();
  }
  currentInterval(): Promise<number> {
    return Promise.resolve(this.interval);
  }
  upsertState(input: FeynmanStateInput): Promise<void> {
    this.state = input;
    return Promise.resolve();
  }
}

describe('SaveFeynmanExplanationUseCase', () => {
  it('saves the attempt and schedules the next review from clarity + current interval', async () => {
    const store = new FakeStore(10);
    const useCase = new SaveFeynmanExplanationUseCase(store);

    await useCase.execute('u1', 'CONCEITO', 'c1', {
      texto: 'minha explicação',
      clareza: 85,
      lacunas: [],
      jargao: ['heapify'],
    });

    expect(store.attempt?.clareza).toBe(85);
    expect(store.attempt?.jargao).toEqual(['heapify']);
    expect(store.state?.ultimaClareza).toBe(85);
    expect(store.state?.intervalo).toBe(22); // 10 * 2.2 (clareza alta)
  });
});
