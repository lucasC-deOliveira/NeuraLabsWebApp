import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProvasService, CreateProvaDto, CreateFromParsedDto } from './provas.service';

@Controller('provas')
@UseGuards(JwtAuthGuard)
export class ProvasController {
  constructor(private readonly svc: ProvasService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateProvaDto) {
    return this.svc.create(userId, dto);
  }

  @Post('parse-upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'prova', maxCount: 1 },
      { name: 'gabarito', maxCount: 1 },
    ], {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por arquivo
    }),
  )
  parseUpload(
    @CurrentUser() userId: string,
    @UploadedFiles() files: { prova?: Express.Multer.File[]; gabarito?: Express.Multer.File[] },
  ) {
    const provaFile = files?.prova?.[0];
    const gabaritoFile = files?.gabarito?.[0];
    if (!provaFile) throw new BadRequestException('Arquivo da prova é obrigatório.');
    if (!gabaritoFile) throw new BadRequestException('Arquivo do gabarito é obrigatório.');

    return this.svc.parseUpload(
      userId,
      provaFile.buffer,
      provaFile.mimetype,
      provaFile.originalname,
      gabaritoFile.buffer,
      gabaritoFile.mimetype,
      gabaritoFile.originalname,
    );
  }

  @Post('from-parsed')
  createFromParsed(@CurrentUser() userId: string, @Body() dto: CreateFromParsedDto) {
    return this.svc.createFromParsed(userId, dto);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.svc.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.svc.findOne(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: Partial<CreateProvaDto>) {
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.svc.remove(userId, id);
  }
}
