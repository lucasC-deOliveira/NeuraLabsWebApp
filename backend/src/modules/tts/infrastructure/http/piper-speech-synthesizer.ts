import { Injectable } from '@nestjs/common';
import type {
  SpeechSynthesizer,
  SynthesisRequest,
} from '../../domain/ports/speech-synthesizer';
import type { PiperConfig } from './piper-config';

// ACL over the local Piper HTTP server (see piper/server.py). Only this adapter
// knows the wire shape: text in the POST body, voice/rate as query params, WAV back.
@Injectable()
export class PiperSpeechSynthesizer implements SpeechSynthesizer {
  constructor(private readonly config: PiperConfig) {}

  async synthesize(request: SynthesisRequest): Promise<Uint8Array> {
    const res = await fetch(this.synthesizeUrl(request), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: request.text,
    });
    if (!res.ok) throw new Error(`piper synthesize failed: ${res.status} ${res.statusText}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  private synthesizeUrl(request: SynthesisRequest): string {
    const params = new URLSearchParams();
    if (request.voice) params.set('voice', request.voice);
    if (request.rate !== undefined) params.set('rate', String(request.rate));
    return `${this.config.baseUrl}/synthesize?${params.toString()}`;
  }
}
