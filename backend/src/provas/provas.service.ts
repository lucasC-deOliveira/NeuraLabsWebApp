import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResolveAiConfigUseCase } from '../modules/settings/application/use-cases/resolve-ai-config.use-case';
import { OpenAI } from 'openai';
import * as mammoth from 'mammoth';
// pdf-parse is a CJS module; require() avoids the "not callable" TS error with import *
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

export interface CreateProvaDto {
  titulo: string;
  descricao?: string;
  questaoIds: string[];
}

export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: 'VERDADEIRO_FALSO' | 'MULTIPLA_ESCOLHA';
  alternativas: Array<{ letra: string; texto: string }> | null;
  gabarito: string;
  explicacao: string | null;
}

export interface CreateFromParsedDto {
  titulo: string;
  descricao?: string;
  questoes: ParsedQuestao[];
}

const QUESTAO_SELECT = {
  id: true,
  tipo: true,
  enunciado: true,
  alternativas: true,
  gabarito: true,
  explicacao: true,
  conceito: { select: { id: true, nome: true } },
};

@Injectable()
export class ProvasService {
  constructor(
    private prisma: PrismaService,
    private resolveAiConfig: ResolveAiConfigUseCase,
  ) {}

  // ---- Extração de texto ----

  private async extractText(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<string> {
    const ext = originalname.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (
      ext === 'docx' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (ext === 'txt' || mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    }

    throw new BadRequestException(`Formato não suportado: ${ext}. Use PDF, DOCX ou TXT.`);
  }

  // ---- Parsing via IA ----

  async parseUpload(
    userId: string,
    provaBuffer: Buffer,
    provaMime: string,
    provaName: string,
    gabaritoBuffer: Buffer,
    gabaritoMime: string,
    gabaritoName: string,
  ): Promise<{ tituloSugerido: string | null; questoes: ParsedQuestao[] }> {
    const [provaText, gabaritoText] = await Promise.all([
      this.extractText(provaBuffer, provaMime, provaName),
      this.extractText(gabaritoBuffer, gabaritoMime, gabaritoName),
    ]);

    const cfg = await this.resolveAiConfig.execute(userId);
    if (!cfg.apiKey)
      throw new BadRequestException('API key não configurada. Configure em Configurações.');

    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });

    const prompt = `Você receberá dois textos:
1. PROVA: texto extraído de um documento de prova/exame
2. GABARITO: texto extraído do gabarito correspondente

Sua tarefa:
- Extraia todas as questões da PROVA
- Para cada questão, determine o tipo: "VERDADEIRO_FALSO" ou "MULTIPLA_ESCOLHA"
- Para questões de múltipla escolha, extraia as alternativas (letras A, B, C, D, E ou a, b, c, d, e)
- Cruze com o GABARITO para preencher o campo gabarito de cada questão
  - Para V/F: use "V" ou "F"
  - Para múltipla escolha: use a letra maiúscula correta ("A", "B", "C", "D" ou "E")
- Se o título/nome da prova aparecer no texto, sugira como tituloSugerido

Retorne JSON exatamente neste formato:
{
  "tituloSugerido": "Nome da prova ou null",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Texto completo da questão",
      "tipo": "MULTIPLA_ESCOLHA",
      "alternativas": [
        {"letra": "A", "texto": "Texto da alternativa A"},
        {"letra": "B", "texto": "Texto da alternativa B"},
        {"letra": "C", "texto": "Texto da alternativa C"},
        {"letra": "D", "texto": "Texto da alternativa D"}
      ],
      "gabarito": "C",
      "explicacao": null
    },
    {
      "numero": 2,
      "enunciado": "A água ferve a 100°C ao nível do mar.",
      "tipo": "VERDADEIRO_FALSO",
      "alternativas": null,
      "gabarito": "V",
      "explicacao": null
    }
  ]
}

Regras importantes:
- Inclua todas as questões na ordem em que aparecem
- Se uma questão não tiver gabarito correspondente, use "?" como gabarito
- Preserve o enunciado completo, incluindo dados de contexto se houver
- Normalize as letras das alternativas para maiúsculas (A, B, C, D)
- Ignore cabeçalhos, instruções gerais e rodapés — apenas as questões

=== PROVA ===
${provaText.slice(0, 12000)}

=== GABARITO ===
${gabaritoText.slice(0, 4000)}`;

    const response = await client.chat.completions.create({
      model: cfg.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) parsed = JSON.parse(match[1].trim());
      else throw new BadRequestException('IA retornou formato inválido.');
    }

    const questoes: ParsedQuestao[] = (parsed.questoes ?? [])
      .map((q: any, i: number) => ({
        numero: q.numero ?? i + 1,
        enunciado: String(q.enunciado ?? '').trim(),
        tipo: q.tipo === 'VERDADEIRO_FALSO' ? 'VERDADEIRO_FALSO' : 'MULTIPLA_ESCOLHA',
        alternativas:
          Array.isArray(q.alternativas) && q.alternativas.length > 0 ? q.alternativas : null,
        gabarito: String(q.gabarito ?? '?').toUpperCase(),
        explicacao: q.explicacao ?? null,
      }))
      .filter((q: ParsedQuestao) => q.enunciado.length > 0);

    return {
      tituloSugerido: parsed.tituloSugerido ?? null,
      questoes,
    };
  }

  // ---- Criar prova a partir de questões parseadas ----

  async createFromParsed(userId: string, dto: CreateFromParsedDto) {
    const prova = await this.prisma.$transaction(async (tx) => {
      // Cria todas as questões primeiro
      const questaoIds: string[] = [];
      for (const q of dto.questoes) {
        const created = await tx.questao.create({
          data: {
            usuarioId: userId,
            tipo: q.tipo as any,
            enunciado: q.enunciado,
            alternativas: q.alternativas ? (q.alternativas as any) : undefined,
            gabarito: q.gabarito,
            explicacao: q.explicacao ?? null,
          },
        });
        questaoIds.push(created.id);
      }

      // Cria a prova vinculando todas
      return tx.prova.create({
        data: {
          usuarioId: userId,
          titulo: dto.titulo,
          descricao: dto.descricao ?? null,
          questoes: {
            create: questaoIds.map((qId, i) => ({ questaoId: qId, ordem: i })),
          },
        },
      });
    });

    return { provaId: prova.id };
  }

  // ---- CRUD base ----

  async create(userId: string, dto: CreateProvaDto) {
    const prova = await this.prisma.prova.create({
      data: {
        usuarioId: userId,
        titulo: dto.titulo,
        descricao: dto.descricao ?? null,
        questoes: {
          create: dto.questaoIds.map((qId, i) => ({ questaoId: qId, ordem: i })),
        },
      },
    });
    return { provaId: prova.id };
  }

  async findAll(userId: string) {
    const provas = await this.prisma.prova.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      include: { _count: { select: { questoes: true } } },
    });
    return provas.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao ?? null,
      totalQuestoes: p._count.questoes,
      dataCriacao: p.dataCriacao,
    }));
  }

  async findOne(userId: string, id: string) {
    const prova = await this.prisma.prova.findUnique({
      where: { id },
      include: {
        questoes: {
          orderBy: { ordem: 'asc' },
          include: { questao: { select: QUESTAO_SELECT } },
        },
      },
    });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    if (prova.usuarioId !== userId) throw new ForbiddenException();

    return {
      id: prova.id,
      titulo: prova.titulo,
      descricao: prova.descricao ?? null,
      dataCriacao: prova.dataCriacao,
      questoes: prova.questoes.map((pq) => ({
        ordem: pq.ordem,
        id: pq.questao.id,
        tipo: pq.questao.tipo,
        enunciado: pq.questao.enunciado,
        alternativas: pq.questao.alternativas ?? null,
        gabarito: pq.questao.gabarito,
        explicacao: pq.questao.explicacao ?? null,
        conceitoNome: (pq.questao as any).conceito?.nome ?? null,
      })),
    };
  }

  async update(userId: string, id: string, dto: Partial<CreateProvaDto>) {
    const prova = await this.prisma.prova.findUnique({ where: { id } });
    if (!prova) throw new NotFoundException();
    if (prova.usuarioId !== userId) throw new ForbiddenException();

    await this.prisma.$transaction(async (tx) => {
      await tx.prova.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined && { titulo: dto.titulo }),
          ...(dto.descricao !== undefined && { descricao: dto.descricao ?? null }),
        },
      });
      if (dto.questaoIds !== undefined) {
        await tx.provaQuestao.deleteMany({ where: { provaId: id } });
        await tx.provaQuestao.createMany({
          data: dto.questaoIds.map((qId, i) => ({ provaId: id, questaoId: qId, ordem: i })),
        });
      }
    });
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const prova = await this.prisma.prova.findUnique({ where: { id } });
    if (!prova) throw new NotFoundException();
    if (prova.usuarioId !== userId) throw new ForbiddenException();
    await this.prisma.prova.delete({ where: { id } });
    return { success: true };
  }
}
