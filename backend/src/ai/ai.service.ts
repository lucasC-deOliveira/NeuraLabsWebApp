import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { GraphService } from '../graph/graph.service';
import { LLM_PORT, type LlmMessage, type LlmPort } from '../modules/ai/domain/ports/llm-port';
import { parseAiJson } from '../modules/ai/domain/services/ai-json';
import { InvalidAiJsonError } from '../modules/ai/domain/errors';

const TIPO_LABEL: Record<string, string> = {
  ASSUNTO: 'assunto',
  TOPICO: 'tópico',
  CONCEITO: 'conceito',
  NOTA: 'nota',
  FLASHCARD: 'flashcard',
  TEXTO_BRUTO: 'texto',
  BARALHO: 'baralho',
};

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly graph: GraphService,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
  ) {}

  // Delega ao domain service parseAiJson; traduz o erro de domínio para a
  // resposta voltada ao usuário (mantém o contrato 400 dos chamadores legados).
  private extractJSON(text: string): any {
    try {
      return parseAiJson(text);
    } catch (e) {
      if (e instanceof InvalidAiJsonError)
        throw new BadRequestException('A IA retornou JSON inválido.');
      throw e;
    }
  }

  private callAI(userId: string, messages: LlmMessage[], maxTokens = 4000): Promise<string> {
    return this.llm.complete({ userId, messages, maxTokens });
  }

  private async loadGraphNameIndex(
    userId: string,
    grafoId: string,
  ): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    const ncs = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId, tipoNode: { in: ['ASSUNTO', 'TOPICO', 'CONCEITO'] } },
      select: { tipoNode: true, referenciaId: true },
    });
    const ids: Record<string, string[]> = {};
    for (const n of ncs) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({
        where: { id: { in: ids.ASSUNTO ?? [] } },
        select: { id: true, nome: true },
      }),
      this.prisma.topico.findMany({
        where: { id: { in: ids.TOPICO ?? [] } },
        select: { id: true, nome: true },
      }),
      this.prisma.conceito.findMany({
        where: { id: { in: ids.CONCEITO ?? [] } },
        select: { id: true, nome: true },
      }),
    ]);
    const nameIndex = new Map<string, string>();
    const lines: string[] = [];
    if (assuntos.length) {
      for (const a of assuntos) nameIndex.set(`ASSUNTO|${a.nome.toLowerCase()}`, a.id);
      lines.push(`ASSUNTOs existentes: ${assuntos.map((a) => `"${a.nome}"`).join(', ')}`);
    }
    if (topicos.length) {
      for (const t of topicos) nameIndex.set(`TOPICO|${t.nome.toLowerCase()}`, t.id);
      lines.push(`TÓPICOs existentes: ${topicos.map((t) => `"${t.nome}"`).join(', ')}`);
    }
    if (conceitos.length) {
      for (const c of conceitos) nameIndex.set(`CONCEITO|${c.nome.toLowerCase()}`, c.id);
      lines.push(
        `CONCEITOs existentes: ${conceitos
          .slice(0, 50)
          .map((c) => `"${c.nome}"`)
          .join(', ')}`,
      );
    }
    const existingContext = lines.length
      ? `\n\nNÓS JÁ NO GRAFO (não duplique — reutilize esses nomes exatos se relevante):\n${lines.join('\n')}`
      : '';
    return { nameIndex, existingContext };
  }

  private async findOrCreateNamedNode(
    userId: string,
    grafoId: string,
    tipoNode: 'ASSUNTO' | 'TOPICO' | 'CONCEITO',
    nome: string,
    descricao: string,
    nameIndex: Map<string, string>,
  ): Promise<{ nodeId: string; created: boolean }> {
    const key = `${tipoNode}|${nome.toLowerCase()}`;
    const existing = nameIndex.get(key);
    if (existing) return { nodeId: existing, created: false };
    const res = await this.graph.createNode(userId, grafoId, { tipoNode, nome, descricao });
    nameIndex.set(key, res.nodeId);
    return { nodeId: res.nodeId, created: true };
  }

  private readonly GRAPH_SYSTEM_PROMPT = `Você é especialista em organização curricular. A partir de um texto bruto, gere um grafo de conhecimento completo e hierárquico.
Responda APENAS JSON válido (sem markdown, sem blocos de código):
{
  "assunto": { "nome": "...", "descricao": "..." },
  "topicos": [
    {
      "nome": "...",
      "descricao": "...",
      "conceitos": [
        {
          "nome": "...",
          "descricao": "...",
          "nota": { "titulo": "...", "conteudo": "explicação detalhada em Markdown" },
          "flashcards": [
            { "pergunta": "...", "resposta": "..." }
          ]
        }
      ]
    }
  ],
  "baralho": "Nome do baralho de estudo"
}
Regras: 1 ASSUNTO que engloba tudo; 2-5 TOPICOs principais; 2-4 CONCEITOs por tópico; 1 NOTA por conceito com explicação detalhada; 1-3 FLASHCARDs por conceito com pergunta e resposta claras.`;

  // Etapa 1: só chama a IA e devolve o plano (sem escrever no DB).
  async planGraphFromText(
    userId: string,
    grafoId: string,
    rawText: string,
  ): Promise<{ plan: any }> {
    if (!rawText.trim()) throw new BadRequestException('Texto não pode estar vazio');
    const { existingContext } = await this.loadGraphNameIndex(userId, grafoId);
    const content = await this.callAI(
      userId,
      [
        { role: 'system', content: this.GRAPH_SYSTEM_PROMPT + existingContext },
        { role: 'user', content: rawText.slice(0, 15000) },
      ],
      6000,
    );
    if (!content) throw new BadRequestException('A IA não retornou conteúdo.');
    return { plan: this.extractJSON(content) };
  }

  // Etapa 2: recebe o plano e persiste tudo no DB (sem chamar a IA).
  async buildGraphFromPlan(
    userId: string,
    grafoId: string,
    rawText: string,
    plan: any,
    saveBruto = true,
  ): Promise<{
    assunto: string;
    topicos: number;
    conceitos: number;
    notas: number;
    flashcards: number;
    baralho: string | null;
  }> {
    return this.persistGraphPlan(userId, grafoId, rawText, plan, saveBruto);
  }

  // Gera grafo completo em uma única chamada (mantido para compatibilidade).
  async generateGraphFromText(
    userId: string,
    grafoId: string,
    rawText: string,
  ): Promise<{
    assunto: string;
    topicos: number;
    conceitos: number;
    notas: number;
    flashcards: number;
    baralho: string | null;
  }> {
    if (!rawText.trim()) throw new BadRequestException('Texto não pode estar vazio');
    const { existingContext } = await this.loadGraphNameIndex(userId, grafoId);
    const content = await this.callAI(userId, [
      { role: 'system', content: this.GRAPH_SYSTEM_PROMPT + existingContext },
      { role: 'user', content: rawText.slice(0, 15000) },
    ]);
    if (!content) throw new BadRequestException('A IA não retornou conteúdo.');
    const parsed = this.extractJSON(content);

    return this.persistGraphPlan(userId, grafoId, rawText, parsed);
  }

  private async persistGraphPlan(
    userId: string,
    grafoId: string,
    rawText: string,
    parsed: any,
    saveBruto = true,
  ): Promise<{
    assunto: string;
    topicos: number;
    conceitos: number;
    notas: number;
    flashcards: number;
    baralho: string | null;
  }> {
    const { nameIndex } = await this.loadGraphNameIndex(userId, grafoId);

    const assuntoNome = String(parsed?.assunto?.nome || 'Assunto').trim() || 'Assunto';
    const { nodeId: assuntoId } = await this.findOrCreateNamedNode(
      userId,
      grafoId,
      'ASSUNTO',
      assuntoNome,
      String(parsed?.assunto?.descricao || ''),
      nameIndex,
    );

    let topicoCount = 0;
    let conceitoCount = 0;
    let notaCount = 0;
    let flashcardCount = 0;
    const allFlashcardIds: string[] = [];
    const allNotaIds: string[] = [];

    for (const t of (Array.isArray(parsed?.topicos) ? parsed.topicos : []).slice(0, 8)) {
      const topicoNome = String(t?.nome || '').trim();
      if (!topicoNome) continue;
      const { nodeId: topicoId, created: topicoCreated } = await this.findOrCreateNamedNode(
        userId,
        grafoId,
        'TOPICO',
        topicoNome,
        String(t?.descricao || ''),
        nameIndex,
      );
      if (topicoCreated) topicoCount++;
      try {
        await this.graph.createEdge(userId, grafoId, {
          sourceNodeId: topicoId,
          targetNodeId: assuntoId,
          tipoRelacao: 'PERTENCE_A',
        });
      } catch {
        /* ignore */
      }

      for (const c of (Array.isArray(t?.conceitos) ? t.conceitos : []).slice(0, 6)) {
        const conceitoNome = String(c?.nome || '').trim();
        if (!conceitoNome) continue;
        const { nodeId: conceitoId, created: conceitoCreated } = await this.findOrCreateNamedNode(
          userId,
          grafoId,
          'CONCEITO',
          conceitoNome,
          String(c?.descricao || ''),
          nameIndex,
        );
        if (conceitoCreated) conceitoCount++;
        try {
          await this.graph.createEdge(userId, grafoId, {
            sourceNodeId: conceitoId,
            targetNodeId: topicoId,
            tipoRelacao: 'PERTENCE_A',
          });
        } catch {
          /* ignore */
        }

        if (c?.nota?.titulo) {
          const notaTitulo = String(c.nota.titulo).trim();
          if (notaTitulo) {
            try {
              const notaRes = await this.graph.createNode(userId, grafoId, {
                tipoNode: 'NOTA',
                titulo: notaTitulo,
                conteudo: String(c.nota.conteudo || ''),
                subtipo: 'EXPLICACAO',
                tipoNota: 'PERMANENTE',
              });
              notaCount++;
              allNotaIds.push(notaRes.nodeId);
              try {
                await this.graph.createEdge(userId, grafoId, {
                  sourceNodeId: notaRes.nodeId,
                  targetNodeId: conceitoId,
                  tipoRelacao: 'EXPLICA',
                });
              } catch {
                /* ignore */
              }
            } catch {
              /* ignore */
            }
          }
        }

        for (const fc of (Array.isArray(c?.flashcards) ? c.flashcards : []).slice(0, 4)) {
          const pergunta = String(fc?.pergunta || '').trim();
          const resposta = String(fc?.resposta || '').trim();
          if (!pergunta || !resposta) continue;
          try {
            const fcRes = await this.graph.createNode(userId, grafoId, {
              tipoNode: 'FLASHCARD',
              pergunta,
              resposta,
            });
            flashcardCount++;
            allFlashcardIds.push(fcRes.nodeId);
            try {
              await this.graph.createEdge(userId, grafoId, {
                sourceNodeId: fcRes.nodeId,
                targetNodeId: conceitoId,
                tipoRelacao: 'HERDA',
              });
            } catch {
              /* ignore */
            }
          } catch {
            /* ignore */
          }
        }
      }
    }

    let baralhoNome: string | null = null;
    if (allFlashcardIds.length > 0) {
      baralhoNome = String(parsed?.baralho || assuntoNome).trim() || assuntoNome;
      try {
        await this.graph.createBaralho(userId, grafoId, baralhoNome, allFlashcardIds);
      } catch {
        /* ignore */
      }
    }

    if (saveBruto && rawText.trim()) {
      try {
        const textoBrutoRes = await this.graph.createNode(userId, grafoId, {
          tipoNode: 'TEXTO_BRUTO',
          titulo: `Fonte: ${assuntoNome}`,
          texto: rawText.trim(),
        });
        for (const notaId of allNotaIds) {
          try {
            await this.graph.createEdge(userId, grafoId, {
              sourceNodeId: textoBrutoRes.nodeId,
              targetNodeId: notaId,
              tipoRelacao: 'GERA',
            });
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    }

    return {
      assunto: assuntoNome,
      topicos: topicoCount,
      conceitos: conceitoCount,
      notas: notaCount,
      flashcards: flashcardCount,
      baralho: baralhoNome,
    };
  }
}
