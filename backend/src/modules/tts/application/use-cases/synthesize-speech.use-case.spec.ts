import { describe, it, expect, beforeEach } from 'vitest';
import { SynthesizeSpeechUseCase } from './synthesize-speech.use-case';
import { EmptySpeechTextError } from '../../domain/errors';
import type { SpeechSynthesizer, SynthesisRequest } from '../../domain/ports/speech-synthesizer';

// Named fake of the speech engine (no HTTP). Records the last request and returns
// deterministic bytes so the use-case can be asserted without a real Piper.
class FakeSpeechSynthesizer implements SpeechSynthesizer {
  lastRequest: SynthesisRequest | null = null;

  async synthesize(request: SynthesisRequest): Promise<Uint8Array> {
    this.lastRequest = request;
    return new Uint8Array([1, 2, 3]);
  }
}

describe('SynthesizeSpeechUseCase', () => {
  let fake: FakeSpeechSynthesizer;
  let useCase: SynthesizeSpeechUseCase;

  beforeEach(() => {
    fake = new FakeSpeechSynthesizer();
    useCase = new SynthesizeSpeechUseCase(fake);
  });

  it('trims the text before handing it to the engine', async () => {
    await useCase.execute({ text: '  Olá  ', voice: 'pt_BR-faber-medium', rate: 1 });
    expect(fake.lastRequest).toEqual({ text: 'Olá', voice: 'pt_BR-faber-medium', rate: 1 });
  });

  it('returns the WAV bytes from the engine', async () => {
    const audio = await useCase.execute({ text: 'Olá' });
    expect(audio).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects blank text without calling the engine', async () => {
    await expect(useCase.execute({ text: '   ' })).rejects.toBeInstanceOf(EmptySpeechTextError);
    expect(fake.lastRequest).toBeNull();
  });
});
