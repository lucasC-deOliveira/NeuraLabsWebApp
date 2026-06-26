import { parseAiJson } from '../../domain/services/ai-json';
import {
  buildCurriculumContext,
  normalizeCurriculumPlan,
  type CurriculumPlan,
  type ExistingCurriculum,
  type NamedEntity,
  type PlanAssunto,
  type PlanTopico,
} from '../../domain/services/curriculum-plan';
import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface SaveNotaInput {
  titulo: string;
  conteudo: string;
}

/**
 * Persists selected note candidates: organizes a curriculum (subjects → topics →
 * concepts) from them via the model, then saves the notes. Returns their ids.
 * @example saveSelectedNotas.execute('u1', [{ titulo, conteudo }])
 */
export class SaveSelectedNotasUseCase {
  constructor(
    private readonly repo: CurriculumRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, candidatas: SaveNotaInput[]): Promise<{ notaIds: string[] }> {
    if (candidatas.length === 0) return { notaIds: [] };
    const existing = await this.repo.loadExisting(userId);
    const content = await this.llm.complete({
      userId,
      messages: buildMessages(candidatas, existing),
    });
    const plan = normalizeCurriculumPlan(parseOrEmpty(content));
    await new CurriculumBuilder(this.repo, userId, existing).build(plan);
    return { notaIds: await this.createNotas(userId, candidatas) };
  }

  private async createNotas(userId: string, candidatas: SaveNotaInput[]): Promise<string[]> {
    const ids: string[] = [];
    for (const c of candidatas) {
      ids.push(await this.repo.createNota(userId, c.titulo, `# ${c.titulo}\n\n${c.conteudo}`));
    }
    return ids;
  }
}

// Resolves/creates the subject→topic→concept hierarchy, reusing entities by name.
class CurriculumBuilder {
  private readonly assuntos: Map<string, string>;
  private readonly topicos: Map<string, string>;
  private readonly conceitos: Map<string, string>;

  constructor(
    private readonly repo: CurriculumRepository,
    private readonly userId: string,
    existing: ExistingCurriculum,
  ) {
    this.assuntos = nameMap(existing.assuntos);
    this.topicos = nameMap(existing.topicos);
    this.conceitos = nameMap(existing.conceitos);
  }

  async build(plan: CurriculumPlan): Promise<void> {
    for (const a of plan.assuntos) await this.ensureAssunto(a.nome);
    for (const t of plan.topicos) await this.ensureTopico(t.nome, plan.assuntos);
    await this.ensureConceitos(plan);
  }

  private async ensureAssunto(nome: string): Promise<string> {
    const key = nome.toLowerCase();
    const existing = this.assuntos.get(key);
    if (existing) return existing;
    const id = await this.repo.createAssunto(this.userId, nome);
    this.assuntos.set(key, id);
    return id;
  }

  private async firstAssunto(): Promise<string> {
    return [...this.assuntos.values()][0] ?? this.ensureAssunto('Geral');
  }

  private async ensureTopico(nome: string, planAssuntos: PlanAssunto[]): Promise<string> {
    const key = nome.toLowerCase();
    const existing = this.topicos.get(key);
    if (existing) return existing;
    const assuntoId = await this.assuntoForTopico(key, planAssuntos);
    const id = await this.repo.createTopico(this.userId, assuntoId, nome);
    this.topicos.set(key, id);
    return id;
  }

  private async assuntoForTopico(topicoKey: string, planAssuntos: PlanAssunto[]): Promise<string> {
    const owner = planAssuntos.find((a) => a.topicos.some((tn) => tn.toLowerCase() === topicoKey));
    const fromPlan = owner ? this.assuntos.get(owner.nome.toLowerCase()) : undefined;
    return fromPlan ?? this.firstAssunto();
  }

  private async firstTopico(): Promise<string> {
    const first = [...this.topicos.values()][0];
    if (first) return first;
    const id = await this.repo.createTopico(this.userId, await this.firstAssunto(), 'Geral');
    this.topicos.set('geral', id);
    return id;
  }

  private async ensureConceitos(plan: CurriculumPlan): Promise<void> {
    for (const t of plan.topicos) await this.conceitosUnder(t);
    for (const nome of plan.conceitos) await this.standaloneConceito(nome);
  }

  private async conceitosUnder(t: PlanTopico): Promise<void> {
    const topicoId = this.topicos.get(t.nome.toLowerCase());
    if (!topicoId) return;
    for (const nome of t.conceitos) await this.ensureConceito(nome, topicoId);
  }

  private async standaloneConceito(nome: string): Promise<void> {
    if (this.conceitos.has(nome.toLowerCase())) return;
    await this.ensureConceito(nome, await this.firstTopico());
  }

  private async ensureConceito(nome: string, topicoId: string): Promise<void> {
    const key = nome.toLowerCase();
    if (this.conceitos.has(key)) return;
    this.conceitos.set(key, await this.repo.createConceito(this.userId, topicoId, nome));
  }
}

const nameMap = (items: NamedEntity[]): Map<string, string> =>
  new Map(items.map((i) => [i.nome.toLowerCase(), i.id]));

function parseOrEmpty(content: string): {
  assuntos?: unknown;
  topicos?: unknown;
  conceitos?: unknown;
} {
  try {
    return parseAiJson(content || '{}') as { assuntos?: unknown };
  } catch {
    return {};
  }
}

function buildMessages(candidatas: SaveNotaInput[], existing: ExistingCurriculum): LlmMessage[] {
  const contextText = buildCurriculumContext(existing) || '(nenhum)';
  const texts = candidatas.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join('\n\n---\n\n');
  return [
    { role: 'system', content: systemPrompt(contextText) },
    { role: 'user', content: texts.slice(0, 15000) },
  ];
}

function systemPrompt(contextText: string): string {
  return (
    'Você é especialista em organização curricular. Dado um conjunto de notas, identifique ' +
    'CONCEITOS, TÓPICOS (com seus conceitos) e ASSUNTOS (com seus tópicos).\n' +
    `Contexto existente:\n${contextText}\n` +
    'Responda APENAS JSON: {"conceitos":[{"nome":"..."}],"topicos":[{"nome":"...","conceitos":["..."]}],' +
    '"assuntos":[{"nome":"...","topicos":["..."]}]}'
  );
}
