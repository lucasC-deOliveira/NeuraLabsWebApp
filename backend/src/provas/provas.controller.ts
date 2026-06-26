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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateProvaUseCase } from '../modules/provas/application/use-cases/create-prova.use-case';
import { CreateProvaFromParsedUseCase } from '../modules/provas/application/use-cases/create-prova-from-parsed.use-case';
import { ListProvasUseCase } from '../modules/provas/application/use-cases/list-provas.use-case';
import { GetProvaUseCase } from '../modules/provas/application/use-cases/get-prova.use-case';
import { UpdateProvaUseCase } from '../modules/provas/application/use-cases/update-prova.use-case';
import { RemoveProvaUseCase } from '../modules/provas/application/use-cases/remove-prova.use-case';
import { ParseExamUploadUseCase } from '../modules/provas/application/use-cases/parse-exam-upload.use-case';
import { ProvasExceptionFilter } from '../modules/provas/interface/provas-exception.filter';
import type {
  CreateProvaFromParsedInput,
  CreateProvaInput,
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
    private readonly updateProva: UpdateProvaUseCase,
    private readonly removeProva: RemoveProvaUseCase,
    private readonly parseExamUpload: ParseExamUploadUseCase,
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
  ) {
    const provaFile = files?.prova?.[0];
    const gabaritoFile = files?.gabarito?.[0];
    if (!provaFile) throw new BadRequestException('Arquivo da prova é obrigatório.');
    if (!gabaritoFile) throw new BadRequestException('Arquivo do gabarito é obrigatório.');

    return this.parseExamUpload.execute(userId, provaFile, gabaritoFile);
  }

  @Post('from-parsed')
  createFromParsed(@CurrentUser() userId: string, @Body() dto: CreateProvaFromParsedInput) {
    return this.createProvaFromParsed.execute(userId, dto);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.listProvas.execute(userId);
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
