import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseFilters,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateProvaUseCase } from '../modules/provas/application/use-cases/create-prova.use-case';
import { CreateProvaFromParsedUseCase } from '../modules/provas/application/use-cases/create-prova-from-parsed.use-case';
import { ListProvasUseCase } from '../modules/provas/application/use-cases/list-provas.use-case';
import { GetProvaUseCase } from '../modules/provas/application/use-cases/get-prova.use-case';
import { GetProvaImagemUseCase } from '../modules/provas/application/use-cases/get-prova-imagem.use-case';
import { UpdateProvaUseCase } from '../modules/provas/application/use-cases/update-prova.use-case';
import { RemoveProvaUseCase } from '../modules/provas/application/use-cases/remove-prova.use-case';
import { ParseExamUploadUseCase } from '../modules/provas/application/use-cases/parse-exam-upload.use-case';
import { SuggestQuestaoConceitosUseCase } from '../modules/provas/application/use-cases/suggest-questao-conceitos.use-case';
import {
  CreateEditalUseCase,
  LinkEditalToProvaUseCase,
  ListEditaisUseCase,
} from '../modules/provas/application/use-cases/edital.use-cases';
import { ProvasExceptionFilter } from '../modules/provas/interface/provas-exception.filter';
import type {
  CreateEditalInput,
  CreateProvaFromParsedInput,
  CreateProvaInput,
  ParsedQuestao,
  UpdateProvaPatch,
} from '../modules/provas/domain/prova';

@Controller('provas')
@UseGuards(JwtAuthGuard)
@UseFilters(ProvasExceptionFilter)
export class ProvasController {
  constructor(
    private readonly createProva: CreateProvaUseCase,
    private readonly createProvaFromParsed: CreateProvaFromParsedUseCase,
    private readonly listProvas: ListProvasUseCase,
    private readonly getProva: GetProvaUseCase,
    private readonly getProvaImagem: GetProvaImagemUseCase,
    private readonly updateProva: UpdateProvaUseCase,
    private readonly removeProva: RemoveProvaUseCase,
    private readonly parseExamUpload: ParseExamUploadUseCase,
    private readonly suggestConceitos: SuggestQuestaoConceitosUseCase,
    private readonly createEdital: CreateEditalUseCase,
    private readonly linkEdital: LinkEditalToProvaUseCase,
    private readonly listEditais: ListEditaisUseCase,
  ) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateProvaInput) {
    return this.createProva.execute(userId, dto);
  }

  @Post('parse-upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'prova', maxCount: 1 },
        { name: 'gabarito', maxCount: 1 },
      ],
      {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por arquivo
      },
    ),
  )
  parseUpload(
    @CurrentUser() userId: string,
    @UploadedFiles() files: { prova?: Express.Multer.File[]; gabarito?: Express.Multer.File[] },
    @Body() body: { aiExtraction?: string },
  ) {
    const provaFile = files?.prova?.[0];
    const gabaritoFile = files?.gabarito?.[0];
    if (!provaFile) throw new BadRequestException('Arquivo da prova é obrigatório.');

    // aiExtraction="false" força extração só determinística (0 token de LLM).
    const allowLlm = body?.aiExtraction !== 'false';
    // Gabarito is optional: without it, every question comes back with gabarito "?"
    // for the user to fill in manually.
    return this.parseExamUpload.execute(userId, provaFile, gabaritoFile, allowLlm);
  }

  // Suggests, per question, the graph CONCEITOs it tests (reusing existing nodes),
  // for the user to confirm in the review before the links are written.
  @Post('suggest-conceitos')
  suggestConceitosForQuestoes(
    @CurrentUser() userId: string,
    @Body() dto: { questoes: ParsedQuestao[] },
  ) {
    return this.suggestConceitos.execute(userId, dto.questoes ?? []);
  }

  @Post('from-parsed')
  createFromParsed(@CurrentUser() userId: string, @Body() dto: CreateProvaFromParsedInput) {
    return this.createProvaFromParsed.execute(userId, dto);
  }

  // Cria o nó EDITAL (título + programa); com provaId, vincula 1:1 à prova.
  @Post('editais')
  createEditalNode(@CurrentUser() userId: string, @Body() dto: CreateEditalInput) {
    return this.createEdital.execute(userId, dto);
  }

  // Vincula um edital existente a uma prova (1:1).
  @Post('editais/:id/link')
  linkEditalToProva(
    @CurrentUser() userId: string,
    @Param('id') editalId: string,
    @Body() dto: { provaId: string; grafoId: string },
  ) {
    return this.linkEdital.execute(userId, editalId, dto.provaId, dto.grafoId);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.listProvas.execute(userId);
  }

  // Declared before ':id' so static paths are not captured as a prova id.
  @Get('editais')
  findEditais(@CurrentUser() userId: string) {
    return this.listEditais.execute(userId);
  }

  @Get('imagens/:id')
  async findImagem(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { mimetype, dados } = await this.getProvaImagem.execute(userId, id);
    return new StreamableFile(dados, { type: mimetype });
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getProva.execute(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateProvaPatch) {
    return this.updateProva.execute(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.removeProva.execute(userId, id);
  }
}
