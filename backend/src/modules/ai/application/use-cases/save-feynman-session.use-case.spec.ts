import { describe, it, expect } from 'vitest';
import { SaveFeynmanSessionUseCase } from './save-feynman-session.use-case';
import type {
  FeynmanAttemptInput,
  FeynmanStateInput,
  FeynmanStore,
} from '../../domain/ports/feynman-store';
import type {
  FeynmanNoteInput,
  FeynmanNotePublisher,
} from '../../domain/ports/feynman-note-publisher';

class FakeStore implements FeynmanStore {
  public attempts: FeynmanAttemptInput[] = [];
  public state: FeynmanStateInput | null = null;
  constructor(private readonly interval: number) {}
  saveAttempt(input: FeynmanAttemptInput): Promise<void> {
    this.attempts.push(input);
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

class FakeNotePublisher implements FeynmanNotePublisher {
  public published: FeynmanNoteInput | null = null;
  publish(input: FeynmanNoteInput): Promise<void> {
    this.published = input;
    return Promise.resolve();
  }
}

const angles = [
  { angulo: 'SIMPLES' as const, texto: 'para criança', clareza: 90, lacunas: [], jargao: [] },
  { angulo: 'ANALOGIA' as const, texto: 'como uma fila', clareza: 60, lacunas: [], jargao: [] },
  { angulo: 'TECNICO' as const, texto: 'formalmente', clareza: 80, lacunas: [], jargao: [] },
];

describe('SaveFeynmanSessionUseCase', () => {
  it('saves one attempt per angle, tagged with its angle', async () => {
    const store = new FakeStore(10);
    const useCase = new SaveFeynmanSessionUseCase(store, new FakeNotePublisher());

    await useCase.execute('u1', 'CONCEITO', 'c1', angles);

    expect(store.attempts).toHaveLength(3);
    expect(store.attempts.map((a) => a.angulo)).toEqual(['SIMPLES', 'ANALOGIA', 'TECNICO']);
  });

  it('schedules from the weakest angle (the weak link defines mastery)', async () => {
    const store = new FakeStore(10);
    const useCase = new SaveFeynmanSessionUseCase(store, new FakeNotePublisher());

    await useCase.execute('u1', 'CONCEITO', 'c1', angles);

    // menor clareza é 60 (40-69) → intervalo = round(10 * 1.5) = 15, min 3
    expect(store.state?.ultimaClareza).toBe(60);
    expect(store.state?.intervalo).toBe(15);
  });

  it('publishes one combined note with a section per angle', async () => {
    const notes = new FakeNotePublisher();
    const useCase = new SaveFeynmanSessionUseCase(new FakeStore(0), notes);

    await useCase.execute('u1', 'CONCEITO', 'c1', angles);

    expect(notes.published?.texto).toBe(
      '## Simples\n\npara criança\n\n## Analogia\n\ncomo uma fila\n\n## Técnico\n\nformalmente',
    );
  });

  it('does nothing when there are no explanations', async () => {
    const store = new FakeStore(0);
    const notes = new FakeNotePublisher();
    const useCase = new SaveFeynmanSessionUseCase(store, notes);

    await useCase.execute('u1', 'CONCEITO', 'c1', []);

    expect(store.attempts).toHaveLength(0);
    expect(store.state).toBeNull();
    expect(notes.published).toBeNull();
  });
});
