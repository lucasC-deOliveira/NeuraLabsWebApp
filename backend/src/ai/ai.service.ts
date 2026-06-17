import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OpenAI } from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { GraphService } from '../graph/graph.service';
import { getAllowedRelations, isRelationAllowed, getInsightTargets, getCanonicalDirection } from '../graph/relation-rules';
import { makeConceptResolver, FlashcardPreview, FlashcardSourceType } from '../content/flashcard-gen';

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

  private async callAI(userId: string, messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
    const { client, model } = await this.openai(userId);
    const response = await client.chat.completions.create({ model, temperature: 0.3, response_format: { type: 'json_object' }, messages });
    return response.choices[0]?.message?.content ?? '';
  }

  // Estágio 1: divide texto bruto em notas candidatas.
  async analyzeRawText(userId: string, rawText: string): Promise<{ candidatas: Array<{ titulo: string; conteudo: string; conceitosPrevistos: string[] }> }> {
    if (!rawText.trim()) return { candidatas: [] };
    const content = await this.callAI(userId, [
      { role: 'system', content: `Você é um assistente de análise de texto educacional. Dado um texto bruto, identifique QUANTAS NOTAS fizerem sentido. Cada nota deve ter titulo e conteudo organizado.\nResponda APENAS JSON: {"notas":[{"titulo":"Nome","conteudo":"Conteúdo organizado"}]}` },
      { role: 'user', content: rawText.slice(0, 15000) },
    ]);
    if (!content) return { candidatas: [] };
    try {
      const parsed = JSON.parse(content);
      return { candidatas: (parsed.notas || []).map((n: any) => ({ titulo: n.titulo || 'Nota sem título', conteudo: n.conteudo || '', conceitosPrevistos: [] })) };
    } catch {
      return { candidatas: [{ titulo: 'Nota', conteudo: rawText, conceitosPrevistos: [] }] };
    }
  }

  // Estágio 2: extrai hierarquia (assunto→tópico→conceito) e cria notas. Arestas semânticas ficam para a UI do grafo.
  async saveSelectedNotas(userId: string, candidatas: Array<{ titulo: string; conteudo: string }>): Promise<{ notaIds: string[] }> {
    if (candidatas.length === 0) return { notaIds: [] };

    const [existingConcepts, existingTopicos, existingAssuntos] = await Promise.all([
      this.prisma.conceito.findMany({ where: { usuarioId: userId } }),
      this.prisma.topico.findMany({ where: { usuarioId: userId } }),
      this.prisma.assunto.findMany({ where: { usuarioId: userId } }),
    ]);
    const contextText = [
      existingAssuntos.length ? `ASSUNTOS: ${existingAssuntos.map((a) => a.nome).join(', ')}` : '',
      existingTopicos.length ? `TÓPICOS: ${existingTopicos.map((t) => t.nome).join(', ')}` : '',
      existingConcepts.length ? `CONCEITOS: ${existingConcepts.map((c) => c.nome).join(', ')}` : '',
    ].filter(Boolean).join('\n');
    const texts = candidatas.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join('\n\n---\n\n');

    const content = await this.callAI(userId, [
      { role: 'system', content: `Você é especialista em organização curricular. Dado um conjunto de notas, identifique CONCEITOS, TÓPICOS (com seus conceitos) e ASSUNTOS (com seus tópicos).\nContexto existente:\n${contextText || '(nenhum)'}\nResponda APENAS JSON: {"conceitos":[{"nome":"..."}],"topicos":[{"nome":"...","conceitos":["..."]}],"assuntos":[{"nome":"...","topicos":["..."]}]}` },
      { role: 'user', content: texts.slice(0, 15000) },
    ]);

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const aiAssuntos: Array<{ nome: string; topicos: string[] }> = (parsed.assuntos || []).map((a: any) => ({ nome: a.nome || 'Assunto', topicos: a.topicos || [] }));
    const aiTopicos: Array<{ nome: string; conceitos: string[] }> = (parsed.topicos || []).map((t: any) => ({ nome: t.nome || 'Tópico', conceitos: t.conceitos || [] }));
    const aiConceitos: Array<{ nome: string }> = (parsed.conceitos || []).map((c: any) => ({ nome: c.nome || 'Conceito' }));

    // Resolve/cria assuntos
    const assuntoByName = new Map<string, string>();
    for (const a of existingAssuntos) assuntoByName.set(a.nome.toLowerCase(), a.id);
    for (const a of aiAssuntos) {
      const key = a.nome.toLowerCase();
      if (!assuntoByName.has(key)) {
        const created = await this.prisma.assunto.create({ data: { usuarioId: userId, nome: a.nome } });
        assuntoByName.set(key, created.id);
      }
    }
    const ensureAssunto = async (): Promise<string> => {
      const first = [...assuntoByName.values()][0];
      if (first) return first;
      const ga = await this.prisma.assunto.create({ data: { usuarioId: userId, nome: 'Geral' } });
      assuntoByName.set('geral', ga.id);
      return ga.id;
    };

    // Resolve/cria tópicos (mapeando ao assunto da agrupação da IA)
    const topicoByName = new Map<string, string>();
    for (const t of existingTopicos) topicoByName.set(t.nome.toLowerCase(), t.id);
    for (const t of aiTopicos) {
      const key = t.nome.toLowerCase();
      if (topicoByName.has(key)) continue;
      let assuntoId: string | null = null;
      for (const a of aiAssuntos) if (a.topicos.some((tn) => tn.toLowerCase() === key)) { assuntoId = assuntoByName.get(a.nome.toLowerCase()) ?? null; break; }
      if (!assuntoId) assuntoId = await ensureAssunto();
      const created = await this.prisma.topico.create({ data: { assuntoId, nome: t.nome, usuarioId: userId } });
      topicoByName.set(key, created.id);
    }
    const ensureTopico = async (): Promise<string> => {
      const first = [...topicoByName.values()][0];
      if (first) return first;
      const assuntoId = await ensureAssunto();
      const gt = await this.prisma.topico.create({ data: { assuntoId, nome: 'Geral', usuarioId: userId } });
      topicoByName.set('geral', gt.id);
      return gt.id;
    };

    // Resolve/cria conceitos (sob o tópico que os contém, ou um fallback)
    const conceitoByName = new Map<string, string>();
    for (const c of existingConcepts) conceitoByName.set(c.nome.toLowerCase(), c.id);
    for (const t of aiTopicos) {
      const tid = topicoByName.get(t.nome.toLowerCase());
      if (!tid) continue;
      for (const cName of t.conceitos) {
        const cKey = cName.toLowerCase();
        if (conceitoByName.has(cKey)) continue;
        const created = await this.prisma.conceito.create({ data: { topicoId: tid, nome: cName, usuarioId: userId } });
        conceitoByName.set(cKey, created.id);
      }
    }
    for (const c of aiConceitos) {
      const cKey = c.nome.toLowerCase();
      if (conceitoByName.has(cKey)) continue;
      const tid = await ensureTopico();
      const created = await this.prisma.conceito.create({ data: { topicoId: tid, nome: c.nome, usuarioId: userId } });
      conceitoByName.set(cKey, created.id);
    }

    // Cria as notas
    const notaIds: string[] = [];
    for (const candidata of candidatas) {
      const rawText = `# ${candidata.titulo}\n\n${candidata.conteudo}`;
      const nota = await this.prisma.nota.create({ data: { usuarioId: userId, titulo: candidata.titulo, conteudo: rawText } });
      notaIds.push(nota.id);
    }
    return { notaIds };
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

  // Geração de flashcards via IA a partir de uma nota (9 tipos de card).
  async generateFlashcardsViaIA(userId: string, notaId: string): Promise<FlashcardPreview[]> {
    const nota = await this.prisma.nota.findFirst({ where: { id: notaId, usuarioId: userId } });
    if (!nota) throw new NotFoundException('Nota não encontrada');
    const allConcepts = await this.prisma.conceito.findMany({ where: { usuarioId: userId }, select: { id: true, nome: true } });
    const conceptContext = allConcepts.map((c) => `- ${c.nome}`).join('\n');

    const { client, model } = await this.openai(userId);
    const response = await client.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em criação de flashcards educacionais. A partir do texto, gere flashcards variados usando os tipos:
- pergunta_resposta: Pergunta direta → Resposta.
- cloze: Preenchimento de lacuna. Ex: "A mitocôndria produz {{...}}." → "ATP"
- bidirecional: Dupla direção (ida e volta).
- explicacao_profunda: Conceito → Explicação detalhada em etapas.
- comparacao: Diferença entre conceitos similares.
- lista_fragmentada: Cite N pontos/funções (máximo 3-4 por card).
- aplicacao_problema: Cenário/situação que testa o conhecimento.
- erro_comum: Erro frequente sobre o tema → Explicação do erro correto.
- identificacao: Identificar/conceituar a partir de descrição.

Regras: use o conteúdo como base para TODAS as respostas; tipos variados; respostas concisas; vincule cada flashcard a um conceito da lista quando possível; gere entre 5-15 flashcards; português brasileiro.
Responda APENAS JSON: {"flashcards":[{"pergunta":"...","resposta":"...","tipo":"pergunta_resposta","conceito":"nome ou desconhecido"}]}

Conceitos disponíveis:
${conceptContext}`,
        },
        { role: 'user', content: nota.conteudo.slice(0, 15000) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];
    const { resolveFallback } = makeConceptResolver(allConcepts);
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { throw new BadRequestException('A IA retornou resposta inválida.'); }

    const out: FlashcardPreview[] = [];
    for (const fc of parsed?.flashcards ?? []) {
      if (!fc?.pergunta || !fc?.resposta) continue;
      const tipo = (fc.tipo as FlashcardSourceType) || 'pergunta_resposta';
      const target = resolveFallback(fc.conceito || '');
      if (!target) continue;
      out.push({
        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
        pergunta: fc.pergunta,
        resposta: fc.resposta,
        conceitoId: target.id,
        conceptNome: fc.conceito !== 'desconhecido' ? target.nome : undefined,
        source: tipo,
      });
    }
    return out;
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

  // Gera grafo completo (ASSUNTO → TOPICOs → CONCEITOs → NOTAs + FLASHCARDs + BARALHO) a partir de texto bruto.
  async generateGraphFromText(
    userId: string,
    grafoId: string,
    rawText: string,
  ): Promise<{ assunto: string; topicos: number; conceitos: number; notas: number; flashcards: number; baralho: string | null }> {
    if (!rawText.trim()) throw new BadRequestException('Texto não pode estar vazio');

    const content = await this.callAI(userId, [
      {
        role: 'system',
        content: `Você é especialista em organização curricular. A partir de um texto bruto, gere um grafo de conhecimento completo e hierárquico.
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
Regras: 1 ASSUNTO que engloba tudo; 2-5 TOPICOs principais; 2-4 CONCEITOs por tópico; 1 NOTA por conceito com explicação detalhada; 1-3 FLASHCARDs por conceito com pergunta e resposta claras.`,
      },
      { role: 'user', content: rawText.slice(0, 15000) },
    ]);

    if (!content) throw new BadRequestException('A IA não retornou conteúdo.');
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { throw new BadRequestException('A IA retornou JSON inválido.'); }

    const assuntoNome = String(parsed?.assunto?.nome || 'Assunto').trim() || 'Assunto';
    const assuntoRes = await this.graph.createNode(userId, grafoId, {
      tipoNode: 'ASSUNTO',
      nome: assuntoNome,
      descricao: String(parsed?.assunto?.descricao || ''),
    });
    const assuntoId = assuntoRes.nodeId;

    let topicoCount = 0;
    let conceitoCount = 0;
    let notaCount = 0;
    let flashcardCount = 0;
    const allFlashcardIds: string[] = [];

    for (const t of (Array.isArray(parsed?.topicos) ? parsed.topicos : []).slice(0, 8)) {
      const topicoNome = String(t?.nome || '').trim();
      if (!topicoNome) continue;
      const topicoRes = await this.graph.createNode(userId, grafoId, {
        tipoNode: 'TOPICO',
        nome: topicoNome,
        descricao: String(t?.descricao || ''),
      });
      const topicoId = topicoRes.nodeId;
      topicoCount++;
      try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: topicoId, targetNodeId: assuntoId, tipoRelacao: 'PERTENCE_A' }); } catch { /* ignore */ }

      for (const c of (Array.isArray(t?.conceitos) ? t.conceitos : []).slice(0, 6)) {
        const conceitoNome = String(c?.nome || '').trim();
        if (!conceitoNome) continue;
        const conceitoRes = await this.graph.createNode(userId, grafoId, {
          tipoNode: 'CONCEITO',
          nome: conceitoNome,
          descricao: String(c?.descricao || ''),
        });
        const conceitoId = conceitoRes.nodeId;
        conceitoCount++;
        try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: conceitoId, targetNodeId: topicoId, tipoRelacao: 'PERTENCE_A' }); } catch { /* ignore */ }

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
              try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: notaRes.nodeId, targetNodeId: conceitoId, tipoRelacao: 'EXPLICA' }); } catch { /* ignore */ }
            } catch { /* ignore */ }
          }
        }

        for (const fc of (Array.isArray(c?.flashcards) ? c.flashcards : []).slice(0, 4)) {
          const pergunta = String(fc?.pergunta || '').trim();
          const resposta = String(fc?.resposta || '').trim();
          if (!pergunta || !resposta) continue;
          try {
            const fcRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'FLASHCARD', pergunta, resposta });
            flashcardCount++;
            allFlashcardIds.push(fcRes.nodeId);
            try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: fcRes.nodeId, targetNodeId: conceitoId, tipoRelacao: 'HERDA' }); } catch { /* ignore */ }
          } catch { /* ignore */ }
        }
      }
    }

    let baralhoNome: string | null = null;
    if (allFlashcardIds.length > 0) {
      baralhoNome = String(parsed?.baralho || assuntoNome).trim() || assuntoNome;
      try { await this.graph.createBaralho(userId, grafoId, baralhoNome, allFlashcardIds); } catch { /* ignore */ }
    }

    return { assunto: assuntoNome, topicos: topicoCount, conceitos: conceitoCount, notas: notaCount, flashcards: flashcardCount, baralho: baralhoNome };
  }

  // ── Feature: Auto-link ─────────────────────────────────────────────────
  async autoLinkGraph(userId: string, grafoId: string): Promise<{ suggestions: Array<{ sourceId: string; targetId: string; sourceNome: string; targetNome: string; relacao: string; motivo: string }> }> {
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const n of graphNodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [assuntos, topicos, conceitos, notas] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.nota.findMany({ where: { id: { in: ids.NOTA ?? [] } }, select: { id: true, titulo: true } }),
    ]);
    const allNodes = [
      ...assuntos.map(a => ({ id: a.id, tipo: 'ASSUNTO', nome: a.nome })),
      ...topicos.map(t => ({ id: t.id, tipo: 'TOPICO', nome: t.nome })),
      ...conceitos.map(c => ({ id: c.id, tipo: 'CONCEITO', nome: c.nome })),
      ...notas.map(n => ({ id: n.id, tipo: 'NOTA', nome: n.titulo || 'Nota' })),
    ];
    if (allNodes.length < 2) return { suggestions: [] };
    // Load existing edges to avoid suggesting duplicates
    const [existingEdges, ncNodes] = await Promise.all([
      this.prisma.conhecimentoAresta.findMany({ where: { grafoId }, select: { nodeOrigemId: true, nodeDestinoId: true } }),
      this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { id: true, referenciaId: true } }),
    ]);
    const refByNcId = new Map(ncNodes.map(n => [n.id, n.referenciaId]));
    const existingPairs = new Set(
      existingEdges
        .filter(e => e.nodeOrigemId && e.nodeDestinoId)
        .map(e => `${refByNcId.get(e.nodeOrigemId!)}:${refByNcId.get(e.nodeDestinoId!)}`)
    );
    const nodeList = allNodes.map(n => `id:${n.id} tipo:${n.tipo} nome:"${n.nome}"`).join('\n');
    const allowedDesc = 'TOPICO→ASSUNTO: PERTENCE_A | CONCEITO→TOPICO: PERTENCE_A, FUNDAMENTA | CONCEITO→CONCEITO: IS_A, PART_OF, PREREQUISITO, DERIVA_DE, EVOLUI_PARA, REFORCA, ALTERNATIVA_A, CONTRASTA_COM | NOTA→CONCEITO: DEFINE, EXPLICA, APROFUNDA, EXEMPLIFICA | NOTA→TOPICO: PERTENCE_A';
    const content = await this.callAI(userId, [
      { role: 'system', content: `Analise o grafo e sugira 5-15 ARESTAS que deveriam existir mas ainda não existem. Relações válidas: ${allowedDesc}\nJSON: {"suggestions":[{"sourceId":"...","targetId":"...","relacao":"...","motivo":"frase curta"}]}` },
      { role: 'user', content: `NÓS:\n${nodeList.slice(0, 7000)}` },
    ]);
    let parsed: any;
    try { parsed = JSON.parse(content ?? '{}'); } catch { return { suggestions: [] }; }
    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    const out: Array<{ sourceId: string; targetId: string; sourceNome: string; targetNome: string; relacao: string; motivo: string }> = [];
    for (const s of parsed?.suggestions ?? []) {
      const src = nodeById.get(s?.sourceId); const tgt = nodeById.get(s?.targetId);
      if (!src || !tgt || !isRelationAllowed(src.tipo, tgt.tipo, s?.relacao)) continue;
      if (existingPairs.has(`${s.sourceId}:${s.targetId}`) || existingPairs.has(`${s.targetId}:${s.sourceId}`)) continue;
      out.push({ sourceId: s.sourceId, targetId: s.targetId, sourceNome: src.nome, targetNome: tgt.nome, relacao: String(s.relacao), motivo: typeof s?.motivo === 'string' ? s.motivo : '' });
      if (out.length >= 15) break;
    }
    return { suggestions: out };
  }

  async applyAutoLink(userId: string, grafoId: string, edges: Array<{ sourceId: string; targetId: string; relacao: string }>): Promise<{ added: number }> {
    let added = 0;
    for (const e of edges) {
      try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: e.sourceId, targetNodeId: e.targetId, tipoRelacao: e.relacao }); added++; } catch { /* duplicata/inválida: ignora */ }
    }
    return { added };
  }

  // ── Feature: Detectar duplicatas ───────────────────────────────────────
  async detectDuplicates(userId: string, grafoId: string): Promise<{ groups: Array<{ nodes: Array<{ id: string; nome: string; tipo: string }>; sugestao: string }> }> {
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const n of graphNodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { id: true, nome: true } }),
    ]);
    const allNodes = [
      ...assuntos.map(a => ({ id: a.id, tipo: 'ASSUNTO', nome: a.nome })),
      ...topicos.map(t => ({ id: t.id, tipo: 'TOPICO', nome: t.nome })),
      ...conceitos.map(c => ({ id: c.id, tipo: 'CONCEITO', nome: c.nome })),
    ];
    if (allNodes.length < 2) return { groups: [] };
    const nodeList = allNodes.map(n => `id:${n.id} tipo:${n.tipo} nome:"${n.nome}"`).join('\n');
    const content = await this.callAI(userId, [
      { role: 'system', content: 'Detecte DUPLICATAS semânticas (ex: "QuickSort" e "Algoritmo Quick Sort"). Agrupe apenas nós com 2+ equivalentes. JSON: {"groups":[{"nodes":[{"id":"..."},{"id":"..."}],"sugestao":"manter X, remover Y"}]}' },
      { role: 'user', content: `NÓS:\n${nodeList.slice(0, 8000)}` },
    ]);
    let parsed: any;
    try { parsed = JSON.parse(content ?? '{}'); } catch { return { groups: [] }; }
    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    const groups: Array<{ nodes: Array<{ id: string; nome: string; tipo: string }>; sugestao: string }> = [];
    for (const g of parsed?.groups ?? []) {
      const nodes = (g?.nodes ?? []).map((n: any) => nodeById.get(n?.id)).filter(Boolean).map((n: any) => ({ id: n.id, nome: n.nome, tipo: n.tipo }));
      if (nodes.length < 2) continue;
      groups.push({ nodes, sugestao: typeof g?.sugestao === 'string' ? g.sugestao : '' });
      if (groups.length >= 10) break;
    }
    return { groups };
  }

  // ── Feature: Expandir nó ──────────────────────────────────────────────
  async expandNode(userId: string, grafoId: string, nodeId: string): Promise<{ topicos: number; conceitos: number; notas: number; flashcards: number }> {
    const nodeInGraph = await this.prisma.nodeConhecimento.findFirst({ where: { grafoId, usuarioId: userId, referenciaId: nodeId }, select: { tipoNode: true } });
    if (!nodeInGraph) throw new NotFoundException('Nó não encontrado neste grafo');
    const tipo = nodeInGraph.tipoNode;
    let nomeAlvo = '', descAlvo = '';
    if (tipo === 'ASSUNTO') { const a = await this.prisma.assunto.findFirst({ where: { id: nodeId } }); nomeAlvo = a?.nome ?? ''; descAlvo = a?.descricao ?? ''; }
    else if (tipo === 'TOPICO') { const t = await this.prisma.topico.findFirst({ where: { id: nodeId } }); nomeAlvo = t?.nome ?? ''; descAlvo = t?.descricao ?? ''; }
    else if (tipo === 'CONCEITO') { const c = await this.prisma.conceito.findFirst({ where: { id: nodeId } }); nomeAlvo = c?.nome ?? ''; descAlvo = c?.descricao ?? ''; }
    else if (tipo === 'NOTA') { const n = await this.prisma.nota.findFirst({ where: { id: nodeId } }); nomeAlvo = n?.titulo ?? ''; descAlvo = n?.conteudo?.slice(0, 2000) ?? ''; }
    else throw new BadRequestException('Tipo não suportado para expansão. Use ASSUNTO, TOPICO, CONCEITO ou NOTA.');
    const SCHEMAS: Record<string, string> = {
      ASSUNTO:  '{"topicos":[{"nome":"...","descricao":"...","conceitos":[{"nome":"...","descricao":"..."}]}]}',
      TOPICO:   '{"conceitos":[{"nome":"...","descricao":"..."}]}',
      CONCEITO: '{"nota":{"titulo":"...","conteudo":"(Markdown)"},"flashcards":[{"pergunta":"...","resposta":"..."}]}',
      NOTA:     '{"flashcards":[{"pergunta":"...","resposta":"..."}]}',
    };
    const PROMPTS: Record<string, string> = {
      ASSUNTO:  `Expanda o ASSUNTO "${nomeAlvo}" criando 2-4 TOPICOs principais, cada um com 2-3 CONCEITOs chave.`,
      TOPICO:   `Expanda o TÓPICO "${nomeAlvo}" criando 3-5 CONCEITOs que compõem este tópico.`,
      CONCEITO: `Expanda o CONCEITO "${nomeAlvo}" com 1 NOTA explicativa detalhada em Markdown e 2-4 FLASHCARDs.`,
      NOTA:     `A partir da NOTA "${nomeAlvo}", gere 3-6 FLASHCARDs de estudo com pergunta e resposta.`,
    };
    const content = await this.callAI(userId, [
      { role: 'system', content: `Expanda o nó de grafo com sub-nós em português. Responda APENAS JSON: ${SCHEMAS[tipo]}` },
      { role: 'user', content: `${PROMPTS[tipo]}\n\nDescrição/Conteúdo: ${descAlvo.slice(0, 2000)}` },
    ]);
    if (!content) return { topicos: 0, conceitos: 0, notas: 0, flashcards: 0 };
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { return { topicos: 0, conceitos: 0, notas: 0, flashcards: 0 }; }
    let topicoCount = 0, conceitoCount = 0, notaCount = 0, flashcardCount = 0;
    if (tipo === 'ASSUNTO') {
      for (const t of (parsed?.topicos ?? []).slice(0, 6)) {
        const tn = String(t?.nome || '').trim(); if (!tn) continue;
        const tRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'TOPICO', nome: tn, descricao: String(t?.descricao || '') }); topicoCount++;
        try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: tRes.nodeId, targetNodeId: nodeId, tipoRelacao: 'PERTENCE_A' }); } catch { /* ignore */ }
        for (const c of (t?.conceitos ?? []).slice(0, 4)) {
          const cn = String(c?.nome || '').trim(); if (!cn) continue;
          const cRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'CONCEITO', nome: cn, descricao: String(c?.descricao || '') }); conceitoCount++;
          try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: cRes.nodeId, targetNodeId: tRes.nodeId, tipoRelacao: 'PERTENCE_A' }); } catch { /* ignore */ }
        }
      }
    } else if (tipo === 'TOPICO') {
      for (const c of (parsed?.conceitos ?? []).slice(0, 6)) {
        const cn = String(c?.nome || '').trim(); if (!cn) continue;
        const cRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'CONCEITO', nome: cn, descricao: String(c?.descricao || '') }); conceitoCount++;
        try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: cRes.nodeId, targetNodeId: nodeId, tipoRelacao: 'PERTENCE_A' }); } catch { /* ignore */ }
      }
    } else if (tipo === 'CONCEITO') {
      if (parsed?.nota?.titulo) {
        try {
          const nRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'NOTA', titulo: String(parsed.nota.titulo).trim(), conteudo: String(parsed.nota.conteudo || ''), subtipo: 'EXPLICACAO', tipoNota: 'PERMANENTE' });
          notaCount++;
          await this.graph.createEdge(userId, grafoId, { sourceNodeId: nRes.nodeId, targetNodeId: nodeId, tipoRelacao: 'EXPLICA' }).catch(() => {});
        } catch { /* ignore */ }
      }
      for (const fc of (parsed?.flashcards ?? []).slice(0, 5)) {
        const p = String(fc?.pergunta || '').trim(), r = String(fc?.resposta || '').trim(); if (!p || !r) continue;
        try {
          const fcRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'FLASHCARD', pergunta: p, resposta: r });
          flashcardCount++;
          await this.graph.createEdge(userId, grafoId, { sourceNodeId: fcRes.nodeId, targetNodeId: nodeId, tipoRelacao: 'HERDA' }).catch(() => {});
        } catch { /* ignore */ }
      }
    } else if (tipo === 'NOTA') {
      for (const fc of (parsed?.flashcards ?? []).slice(0, 6)) {
        const p = String(fc?.pergunta || '').trim(), r = String(fc?.resposta || '').trim(); if (!p || !r) continue;
        try {
          const fcRes = await this.graph.createNode(userId, grafoId, { tipoNode: 'FLASHCARD', pergunta: p, resposta: r });
          flashcardCount++;
          await this.graph.createEdge(userId, grafoId, { sourceNodeId: fcRes.nodeId, targetNodeId: nodeId, tipoRelacao: 'TESTA' }).catch(() => {});
        } catch { /* ignore */ }
      }
    }
    return { topicos: topicoCount, conceitos: conceitoCount, notas: notaCount, flashcards: flashcardCount };
  }

  // ── Feature: Resumo de comunidade ──────────────────────────────────────
  async generateCommunitySummary(userId: string, grafoId: string, nodeIds: string[]): Promise<{ titulo: string; resumo: string }> {
    if (!nodeIds.length) throw new BadRequestException('Lista de nós vazia');
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId, referenciaId: { in: nodeIds } }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const n of graphNodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [assuntos, topicos, conceitos, notas] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: { nome: true, descricao: true } }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { nome: true, descricao: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { nome: true, descricao: true } }),
      this.prisma.nota.findMany({ where: { id: { in: ids.NOTA ?? [] } }, select: { titulo: true, conteudo: true } }),
    ]);
    const ctx = [
      ...assuntos.map(a => `[ASSUNTO] ${a.nome}${a.descricao ? ': ' + a.descricao.slice(0, 150) : ''}`),
      ...topicos.map(t => `[TÓPICO] ${t.nome}${t.descricao ? ': ' + t.descricao.slice(0, 150) : ''}`),
      ...conceitos.map(c => `[CONCEITO] ${c.nome}${c.descricao ? ': ' + c.descricao.slice(0, 200) : ''}`),
      ...notas.map(n => `[NOTA] ${n.titulo || 'Nota'}: ${n.conteudo?.slice(0, 400) || ''}`),
    ].join('\n\n');
    if (!ctx.trim()) throw new BadRequestException('Nós sem conteúdo para resumir');
    const content = await this.callAI(userId, [
      { role: 'system', content: 'Gere um RESUMO DE ESTUDO coerente em Markdown (200-500 palavras) dos nós de um cluster. Explique os conceitos de forma conectada, não apenas liste. JSON: {"titulo":"...","resumo":"(Markdown)"}' },
      { role: 'user', content: `NÓDES DO CLUSTER:\n${ctx.slice(0, 8000)}` },
    ]);
    let parsed: any;
    try { parsed = JSON.parse(content ?? '{}'); } catch { throw new BadRequestException('A IA retornou resposta inválida.'); }
    return { titulo: typeof parsed?.titulo === 'string' ? parsed.titulo : 'Resumo do cluster', resumo: typeof parsed?.resumo === 'string' ? parsed.resumo : '' };
  }

  // ── Feature: Pré-requisitos faltantes ─────────────────────────────────
  async detectMissingPrerequisites(userId: string, grafoId: string): Promise<{ prerequisites: Array<{ nome: string; tipo: string; motivo: string; shouldConnectTo: Array<{ id: string; nome: string }> }> }> {
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { tipoNode: true, referenciaId: true } });
    const ids: Record<string, string[]> = {};
    for (const n of graphNodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    const [topicos, conceitos] = await Promise.all([
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: { id: true, nome: true } }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: { id: true, nome: true } }),
    ]);
    const allNodes = [...topicos.map(t => ({ id: t.id, tipo: 'TOPICO', nome: t.nome })), ...conceitos.map(c => ({ id: c.id, tipo: 'CONCEITO', nome: c.nome }))];
    if (allNodes.length === 0) return { prerequisites: [] };
    const nodeList = allNodes.map(n => `id:${n.id} tipo:${n.tipo} nome:"${n.nome}"`).join('\n');
    const content = await this.callAI(userId, [
      { role: 'system', content: 'Detecte PRÉ-REQUISITOS faltantes no grafo. Sugira 3-8 novos nós (CONCEITO ou TOPICO) que deveriam existir como pré-requisito. JSON: {"prerequisites":[{"nome":"...","tipo":"CONCEITO","motivo":"...","shouldConnectTo":[{"id":"..."}]}]}' },
      { role: 'user', content: `NÓS:\n${nodeList.slice(0, 7000)}` },
    ]);
    let parsed: any;
    try { parsed = JSON.parse(content ?? '{}'); } catch { return { prerequisites: [] }; }
    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    const out: Array<{ nome: string; tipo: string; motivo: string; shouldConnectTo: Array<{ id: string; nome: string }> }> = [];
    for (const p of parsed?.prerequisites ?? []) {
      const nome = typeof p?.nome === 'string' ? p.nome.trim() : ''; if (!nome) continue;
      const tipo = ['CONCEITO', 'TOPICO'].includes(p?.tipo) ? String(p.tipo) : 'CONCEITO';
      const connects = (p?.shouldConnectTo ?? []).map((c: any) => nodeById.get(c?.id)).filter(Boolean).map((n: any) => ({ id: n.id, nome: n.nome }));
      out.push({ nome, tipo, motivo: typeof p?.motivo === 'string' ? p.motivo : '', shouldConnectTo: connects });
      if (out.length >= 8) break;
    }
    return { prerequisites: out };
  }

  async addMissingPrerequisite(userId: string, grafoId: string, nome: string, tipo: string, connectToIds: string[]): Promise<{ nodeId: string }> {
    const res = await this.graph.createNode(userId, grafoId, { tipoNode: tipo as any, nome, descricao: '' });
    const targetNodes = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId, referenciaId: { in: connectToIds } },
      select: { referenciaId: true, tipoNode: true },
    });
    const typeByRefId = new Map(targetNodes.map(n => [n.referenciaId, n.tipoNode]));
    for (const targetId of connectToIds) {
      const targetType = typeByRefId.get(targetId);
      if (!targetType) continue;
      let relacao: string;
      if (tipo === 'CONCEITO' && targetType === 'CONCEITO') relacao = 'PREREQUISITO';
      else if (tipo === 'CONCEITO' && targetType === 'TOPICO') relacao = 'PERTENCE_A';
      else if (tipo === 'TOPICO' && targetType === 'TOPICO') relacao = 'DEPENDE_DE';
      else if (tipo === 'TOPICO' && targetType === 'ASSUNTO') relacao = 'PERTENCE_A';
      else continue;
      try { await this.graph.createEdge(userId, grafoId, { sourceNodeId: res.nodeId, targetNodeId: targetId, tipoRelacao: relacao }); } catch { /* ignore duplicate */ }
    }
    return { nodeId: res.nodeId };
  }

  // Gap Detection: sugere nós que poderiam conectar dois clusters sem arestas entre si.
  async suggestGapFill(
    userId: string,
    grafoId: string,
    body: { labelsA: string[]; labelsB: string[]; bridgeA: string; bridgeB: string },
  ): Promise<{ insights: NodeInsight[] }> {
    const { labelsA, labelsB, bridgeA, bridgeB } = body;
    if (!labelsA.length || !labelsB.length) return { insights: [] };

    const targets = [
      { tipo: 'CONCEITO', relacoes: getAllowedRelations('CONCEITO', 'CONCEITO') },
      { tipo: 'NOTA',     relacoes: getAllowedRelations('NOTA', 'CONCEITO') },
    ];
    const targetsDesc = targets.map(t => `- tipoNo "${t.tipo}" → relações: ${t.relacoes.join(', ')}`).join('\n');

    const content = await this.callAI(userId, [
      {
        role: 'system',
        content: `Você analisa dois clusters de um grafo de conhecimento que NÃO têm nenhuma conexão entre si — isso é uma lacuna estrutural (structural gap). Sugira 4-6 novos nós (conceitos ou notas) que poderiam criar pontes intelectuais entre eles.\nCada nó sugerido deve: (1) relacionar-se semanticamente com ambos os clusters; (2) usar tipoNo e relacao SOMENTE dos combos válidos:\n${targetsDesc}\nResponda em JSON: {"insights":[{"categoria":"Lacuna","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}`,
      },
      {
        role: 'user',
        content: `CLUSTER A (${labelsA.length} nós): ${labelsA.slice(0, 20).join(', ')}\nNó de borda de A mais próximo de B: "${bridgeA}"\n\nCLUSTER B (${labelsB.length} nós): ${labelsB.slice(0, 20).join(', ')}\nNó de borda de B mais próximo de A: "${bridgeB}"`,
      },
    ]);

    let parsed: any;
    try { parsed = JSON.parse(content ?? '{}'); } catch { return { insights: [] }; }

    const insights: NodeInsight[] = [];
    for (const i of parsed?.insights ?? []) {
      const titulo = typeof i?.titulo === 'string' ? i.titulo.trim() : '';
      if (!titulo) continue;
      insights.push({
        categoria: 'Lacuna',
        titulo,
        descricao: typeof i?.descricao === 'string' ? i.descricao.trim() : '',
        tipoNo: typeof i?.tipoNo === 'string' ? i.tipoNo : 'CONCEITO',
        relacao: typeof i?.relacao === 'string' ? i.relacao : 'RELACIONADO',
      });
      if (insights.length >= 6) break;
    }
    return { insights };
  }
}
