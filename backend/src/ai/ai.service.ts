import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OpenAI } from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { GraphService } from '../graph/graph.service';
import { getAllowedRelations, isRelationAllowed, getInsightTargets, getCanonicalDirection } from '../graph/relation-rules';

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: 'ASSUNTO' | 'TOPICO' | 'CONCEITO';
  nodeNome: string;
  relacao: string;
  motivo: string;
}
export interface NodeInsight {
  categoria: string;
  titulo: string;
  descricao: string;
  tipoNo: string;
  relacao: string;
}

const INSIGHT_CATEGORIES = ['Relacionado', 'Aprofundar', 'Conexão', 'Lacuna', 'Aplicação'];
const TIPO_LABEL: Record<string, string> = { ASSUNTO: 'assunto', TOPICO: 'tópico', CONCEITO: 'conceito', NOTA: 'nota', FLASHCARD: 'flashcard', TEXTO_BRUTO: 'texto', BARALHO: 'baralho' };

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly graph: GraphService,
  ) {}

  private async openai(userId: string) {
    const cfg = await this.settings.resolveAIConfig(userId);
    if (!cfg.apiKey) throw new BadRequestException('API key não configurada. Configure em Configurações.');
    return { client: new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl }), model: cfg.model };
  }

  async generateNodeInsights(userId: string, grafoId: string, nodeId: string) {
    const target = await this.prisma.nodeConhecimento.findFirst({ where: { grafoId, usuarioId: userId, referenciaId: nodeId }, select: { tipoNode: true } });
    if (!target) throw new NotFoundException('Nó não encontrado neste grafo.');

    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const n of graphNodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [assuntos, topicos, conceitos, notas, flashcards] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
      this.prisma.nota.findMany({ where: { id: { in: ids.NOTA ?? [] } }, select: { id: true, titulo: true, conteudo: true } }),
      this.prisma.flashcard.findMany({ where: { id: { in: ids.FLASHCARD ?? [] } }, select: { id: true, pergunta: true, resposta: true } }),
    ]);
    type Ctx = { id: string; tipo: string; nome: string; corpo?: string };
    const ctx = new Map<string, Ctx>();
    for (const a of assuntos) ctx.set(a.id, { id: a.id, tipo: 'ASSUNTO', nome: a.nome, corpo: a.descricao ?? undefined });
    for (const t of topicos) ctx.set(t.id, { id: t.id, tipo: 'TOPICO', nome: t.nome, corpo: t.descricao ?? undefined });
    for (const c of conceitos) ctx.set(c.id, { id: c.id, tipo: 'CONCEITO', nome: c.nome, corpo: c.descricao ?? undefined });
    for (const n of notas) ctx.set(n.id, { id: n.id, tipo: 'NOTA', nome: n.titulo || 'Nota', corpo: n.conteudo });
    for (const f of flashcards) ctx.set(f.id, { id: f.id, tipo: 'FLASHCARD', nome: f.pergunta, corpo: f.resposta });

    const alvo = ctx.get(nodeId);
    if (!alvo) throw new NotFoundException('Conteúdo do nó não encontrado.');
    const contextoLista = [...ctx.values()].filter((c) => c.id !== nodeId).slice(0, 100).map((c) => `- [${TIPO_LABEL[c.tipo] ?? c.tipo}] ${c.nome}`).join('\n');
    const targets = getInsightTargets(target.tipoNode);
    const targetsDesc = targets.map((t) => `- tipoNo "${t.tipo}" → relacoes possíveis: ${t.relacoes.join(', ')}`).join('\n');
    const defaultCombo = targets[0] ? { tipoNo: targets[0].tipo, relacao: targets[0].relacoes[0] } : null;

    const { client, model } = await this.openai(userId);
    const tipoAlvo = TIPO_LABEL[alvo.tipo] ?? alvo.tipo;
    const response = await client.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Você é um tutor que analisa um nó de um grafo de conhecimento e gera INSIGHTS. Cada insight: categoria (uma de [${INSIGHT_CATEGORIES.join(', ')}]), titulo (3-8 palavras), descricao (1-2 frases), tipoNo e relacao escolhidos SOMENTE entre os combos válidos:\n${targetsDesc}\nEntre 4 e 8 insights. Responda em JSON: {"insights":[{"categoria":"...","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}` },
        { role: 'user', content: `NÓ-ALVO (${tipoAlvo}): ${alvo.nome}\n${alvo.corpo ? `Conteúdo:\n${alvo.corpo.slice(0, 3000)}` : '(sem conteúdo)'}\n\nCONTEXTO DO GRAFO:\n${contextoLista || '(sem outros nós)'}` },
      ],
    });
    let parsed: any;
    try { parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}'); } catch { throw new BadRequestException('A IA retornou resposta inválida.'); }
    const insights: NodeInsight[] = [];
    for (const i of parsed?.insights ?? []) {
      const titulo = typeof i?.titulo === 'string' ? i.titulo.trim() : '';
      if (!titulo) continue;
      const categoria = typeof i?.categoria === 'string' && INSIGHT_CATEGORIES.includes(i.categoria) ? i.categoria : 'Relacionado';
      let tipoNo = typeof i?.tipoNo === 'string' ? i.tipoNo : '';
      let relacao = typeof i?.relacao === 'string' ? i.relacao : '';
      if (!isRelationAllowed(target.tipoNode, tipoNo, relacao)) {
        if (!defaultCombo) continue;
        tipoNo = defaultCombo.tipoNo; relacao = defaultCombo.relacao;
      }
      insights.push({ categoria, titulo, descricao: typeof i?.descricao === 'string' ? i.descricao.trim() : '', tipoNo, relacao });
      if (insights.length >= 8) break;
    }
    return { nodeNome: alvo.nome, nodeTipo: alvo.tipo, insights };
  }

  async addInsightsToGraph(userId: string, grafoId: string, sourceNodeId: string, insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }>) {
    const source = await this.prisma.nodeConhecimento.findFirst({ where: { grafoId, usuarioId: userId, referenciaId: sourceNodeId }, select: { tipoNode: true } });
    if (!source) throw new NotFoundException('Nó de origem não encontrado.');
    const sourceType = source.tipoNode;

    const existing = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId, tipoNode: { in: ['ASSUNTO', 'TOPICO', 'CONCEITO'] } }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const e of existing) (ids[e.tipoNode] ??= []).push(e.referenciaId);
    const [exA, exT, exC] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { id: true, nome: true } }),
    ]);
    const nameIndex = new Map<string, string>();
    for (const a of exA) nameIndex.set(`ASSUNTO|${a.nome.toLowerCase()}`, a.id);
    for (const t of exT) nameIndex.set(`TOPICO|${t.nome.toLowerCase()}`, t.id);
    for (const c of exC) nameIndex.set(`CONCEITO|${c.nome.toLowerCase()}`, c.id);

    let added = 0;
    for (const ins of insights) {
      const titulo = (ins.titulo ?? '').trim();
      if (!titulo) continue;
      if (!isRelationAllowed(sourceType, ins.tipoNo, ins.relacao)) continue;
      const dir = getCanonicalDirection(sourceType, ins.tipoNo, ins.relacao);
      if (!dir) continue;
      const key = `${ins.tipoNo}|${titulo.toLowerCase()}`;
      let targetRef = nameIndex.get(key) ?? null;
      if (!targetRef) {
        const res = await this.graph.createNode(userId, grafoId, { tipoNode: ins.tipoNo as never, nome: titulo, descricao: ins.descricao ?? '' });
        targetRef = res.nodeId;
        nameIndex.set(key, targetRef);
      }
      const sourceIsOrigem = dir[0] === sourceType;
      try {
        await this.graph.createEdge(userId, grafoId, {
          sourceNodeId: sourceIsOrigem ? sourceNodeId : targetRef,
          targetNodeId: sourceIsOrigem ? targetRef : sourceNodeId,
          tipoRelacao: ins.relacao,
        });
        added++;
      } catch {
        // aresta duplicada/inválida: ignora
      }
    }
    return { added };
  }

  async suggestNotaRelations(userId: string, grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]> {
    if (!titulo.trim() && !conteudo.trim()) return [];
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId, tipoNode: { in: ['ASSUNTO', 'TOPICO', 'CONCEITO'] } }, select: { tipoNode: true, referenciaId: true } });
    if (graphNodes.length === 0) return [];
    const ids: Record<string, string[]> = { ASSUNTO: [], TOPICO: [], CONCEITO: [] };
    for (const n of graphNodes) ids[n.tipoNode]?.push(n.referenciaId);
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO }, usuarioId: userId }, select: { id: true, nome: true, descricao: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO }, usuarioId: userId }, select: { id: true, nome: true, descricao: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO }, usuarioId: userId }, select: { id: true, nome: true, descricao: true } }),
    ]);
    const candidates = [
      ...assuntos.map((a) => ({ id: a.id, tipo: 'ASSUNTO' as const, nome: a.nome, descricao: a.descricao })),
      ...topicos.map((t) => ({ id: t.id, tipo: 'TOPICO' as const, nome: t.nome, descricao: t.descricao })),
      ...conceitos.map((c) => ({ id: c.id, tipo: 'CONCEITO' as const, nome: c.nome, descricao: c.descricao })),
    ];
    if (candidates.length === 0) return [];
    const candidateList = candidates.map((c) => `- id: ${c.id} | tipo: ${c.tipo} | nome: ${c.nome}${c.descricao ? ` | descricao: ${c.descricao}` : ''}`).join('\n');
    const allowedByType = (['CONCEITO', 'TOPICO', 'ASSUNTO'] as const).map((t) => `- NOTA → ${t}: ${getAllowedRelations('NOTA', t).join(', ')}`).join('\n');

    const { client, model } = await this.openai(userId);
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Você analisa uma nota (Zettelkasten) e sugere relações com nós de um grafo (a nota é sempre a origem).\nRelações permitidas:\n${allowedByType}\nSugira APENAS nós da lista (id exato), só relações permitidas, no máximo 8 pertinentes. JSON: {"sugestoes":[{"nodeId":"...","relacao":"...","motivo":"frase curta"}]}` },
        { role: 'user', content: `NOTA:\nTítulo: ${titulo}\nConteúdo:\n${conteudo.slice(0, 4000)}\n\nCANDIDATOS:\n${candidateList}` },
      ],
    });
    let parsed: any;
    try { parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}'); } catch { throw new BadRequestException('A IA retornou resposta inválida.'); }
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: NotaRelationSuggestion[] = [];
    for (const s of parsed?.sugestoes ?? []) {
      const cand = byId.get(s?.nodeId);
      if (!cand || seen.has(cand.id)) continue;
      if (!isRelationAllowed('NOTA', cand.tipo, s?.relacao)) continue;
      seen.add(cand.id);
      out.push({ nodeId: cand.id, nodeTipo: cand.tipo, nodeNome: cand.nome, relacao: s.relacao, motivo: typeof s?.motivo === 'string' ? s.motivo : '' });
      if (out.length >= 8) break;
    }
    return out;
  }
}
