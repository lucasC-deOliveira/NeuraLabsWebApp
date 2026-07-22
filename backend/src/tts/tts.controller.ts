import {
  Body,
  Controller,
  Header,
  Post,
  StreamableFile,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SynthesizeSpeechUseCase } from '../modules/tts/application/use-cases/synthesize-speech.use-case';
import { TtsDomainExceptionFilter } from '../modules/tts/interface/tts-domain-exception.filter';

interface SynthesizeBody {
  text: string;
  voice?: string;
  rate?: number;
}

@UseGuards(JwtAuthGuard)
@UseFilters(TtsDomainExceptionFilter)
@Controller('tts')
export class TtsController {
  constructor(private readonly synthesizeSpeech: SynthesizeSpeechUseCase) {}

  @Post('synthesize')
  @Header('Content-Type', 'audio/wav')
  @Header('Cache-Control', 'no-store')
  async synthesize(@Body() body: SynthesizeBody): Promise<StreamableFile> {
    const audio = await this.synthesizeSpeech.execute(body);
    return new StreamableFile(Buffer.from(audio));
  }
}
