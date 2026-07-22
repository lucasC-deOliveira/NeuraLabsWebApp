import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TtsController } from './tts.controller';
import { SynthesizeSpeechUseCase } from '../modules/tts/application/use-cases/synthesize-speech.use-case';
import {
  SPEECH_SYNTHESIZER,
  type SpeechSynthesizer,
} from '../modules/tts/domain/ports/speech-synthesizer';
import { PiperSpeechSynthesizer } from '../modules/tts/infrastructure/http/piper-speech-synthesizer';
import { piperConfigFromEnv } from '../modules/tts/infrastructure/http/piper-config';

@Module({
  imports: [AuthModule],
  controllers: [TtsController],
  providers: [
    { provide: SPEECH_SYNTHESIZER, useFactory: () => new PiperSpeechSynthesizer(piperConfigFromEnv()) },
    {
      provide: SynthesizeSpeechUseCase,
      useFactory: (synth: SpeechSynthesizer) => new SynthesizeSpeechUseCase(synth),
      inject: [SPEECH_SYNTHESIZER],
    },
  ],
})
export class TtsModule {}
