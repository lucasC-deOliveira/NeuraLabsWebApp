import { EmptySpeechTextError } from '../../domain/errors';
import type { SpeechSynthesizer, SynthesisRequest } from '../../domain/ports/speech-synthesizer';

/**
 * Validates the request and delegates to the speech engine, returning WAV bytes.
 * Trims the text so a blank string never reaches the engine.
 * @example useCase.execute({ text: 'Olá', voice: 'pt_BR-faber-medium', rate: 1 })
 */
export class SynthesizeSpeechUseCase {
  constructor(private readonly synthesizer: SpeechSynthesizer) {}

  async execute(request: SynthesisRequest): Promise<Uint8Array> {
    const text = request.text?.trim() ?? '';
    if (!text) throw new EmptySpeechTextError(request.text ?? '');
    return this.synthesizer.synthesize({ ...request, text });
  }
}
