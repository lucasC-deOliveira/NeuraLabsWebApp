// Anti-Corruption Layer for text-to-speech: the core speaks this port; only the
// adapter knows the concrete engine (a local Piper container). Used to read a
// flashcard's question/answer aloud in a natural neural voice.

export interface SynthesisRequest {
  text: string;
  // Engine voice id (e.g. "pt_BR-faber-medium"). Omitted → the engine's default.
  voice?: string;
  // Speed multiplier; the engine clamps to its safe range.
  rate?: number;
}

export interface SpeechSynthesizer {
  // Returns the spoken audio as WAV bytes.
  synthesize(request: SynthesisRequest): Promise<Uint8Array>;
}

export const SPEECH_SYNTHESIZER = Symbol('SPEECH_SYNTHESIZER');
