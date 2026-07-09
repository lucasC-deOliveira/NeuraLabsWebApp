import { parseAiJson } from '../../domain/services/ai-json';
import { applyPlacements } from '../../domain/services/ai-roadmap-placement';
import type { PathStep } from '../../domain/services/learning-path';
import type {
  AiRoadmapBuilder,
  RoadmapResult,
} from '../../domain/ports/ai-roadmap-builder';
import type { LearningGraphRepository } from '../../domain/ports/learning-graph-repository';
import type { RoadmapTrilhaRepository } from '../../domain/ports/roadmap-trilha-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';
import type { GenerateLearningPathUseCase } from './generate-learning-path.use-case';

const MODE = 'ai';
const NEW_MOTIVO = 'Adicionado recentemente ao grafo';

const PLACEMENT_SYSTEM =
  'Você recebe uma TRILHA de estudo já ordenada e uma lista de CONCEITOS NOVOS. ' +
  'Para cada novo, diga após qual nó da trilha ele deve entrar, respeitando pré-requisitos ' +
  'e prioridade. JSON: {"placements":[{"nome":"nome do novo","after":"nome do nó existente ou vazio para o início"}]}.';

/**
 * LLM-driven roadmap: the first run orders the whole graph (reusing the learning-path
 * use-case); later runs ask the model to place ONLY the newly-added nodes into the
 * persisted order — cheap and stable. Model failure degrades to appending the new
 * nodes at the end.
 * @example buildAiRoadmap.buildAi('u1', 'g1', false)
 */
export class BuildAiRoadmapUseCase implements AiRoadmapBuilder {
  constructor(
    private readonly generate: GenerateLearningPathUseCase,
    private readonly graph: LearningGraphRepository,
    private readonly trilhas: RoadmapTrilhaRepository,
    private readonly llm: LlmPort,
  ) {}

  async buildAi(userId: string, grafoId: string, regenerate: boolean): Promise<RoadmapResult> {
    const persisted = regenerate ? null : await this.trilhas.load(userId, grafoId, MODE);
    if (!persisted) return this.fullGenerate(userId, grafoId);
    const news = await this.newSteps(userId, grafoId, persisted.itens);
    if (news.length === 0) {
      return { itens: persisted.itens, dataGeracao: persisted.dataGeracao.toISOString(), novos: 0 };
    }
    const order = await this.placeNew(userId, persisted.itens, news);
    return this.save(userId, grafoId, order, news.length);
  }

  private async fullGenerate(userId: string, grafoId: string): Promise<RoadmapResult> {
    const { steps } = await this.generate.execute(userId, grafoId);
    return this.save(userId, grafoId, steps, 0);
  }

  private async save(
    userId: string,
    grafoId: string,
    itens: PathStep[],
    novos: number,
  ): Promise<RoadmapResult> {
    const dataGeracao = await this.trilhas.save(userId, grafoId, MODE, itens);
    return { itens, dataGeracao: dataGeracao.toISOString(), novos };
  }

  // Graph nodes not yet in the persisted trilha, as steps to be placed.
  private async newSteps(userId: string, grafoId: string, persisted: PathStep[]): Promise<PathStep[]> {
    const { nodes } = await this.graph.loadLearningGraph(userId, grafoId);
    const seen = new Set(persisted.map((s) => s.nodeId));
    return nodes
      .filter((n) => !seen.has(n.id))
      .map((n) => ({ nodeId: n.id, nome: n.nome, tipo: n.tipo, motivo: NEW_MOTIVO }));
  }

  private async placeNew(
    userId: string,
    existing: PathStep[],
    news: PathStep[],
  ): Promise<PathStep[]> {
    const content = await this.llm.complete({
      userId,
      messages: placementMessages(existing, news),
    });
    return applyPlacements(existing, news, parsePlacements(content, existing, news));
  }
}

function placementMessages(existing: PathStep[], news: PathStep[]): LlmMessage[] {
  const trilha = existing.map((s) => `- ${s.nome}`).join('\n').slice(0, 4000);
  const novos = news.map((s) => `- ${s.nome}`).join('\n').slice(0, 2000);
  return [
    { role: 'system', content: PLACEMENT_SYSTEM },
    { role: 'user', content: `TRILHA ATUAL (em ordem):\n${trilha}\n\nCONCEITOS NOVOS:\n${novos}` },
  ];
}

interface RawPlacement {
  nome?: unknown;
  after?: unknown;
}

// Maps each new step's nodeId → the anchor node it should follow (null = append).
function parsePlacements(
  content: string,
  existing: PathStep[],
  news: PathStep[],
): Map<string, string | null> {
  const byExisting = byName(existing);
  const byNew = byName(news);
  const map = new Map<string, string | null>();
  for (const p of readPlacements(content)) {
    const newId = byNew.get(norm(p.nome));
    if (newId) map.set(newId, byExisting.get(norm(p.after)) ?? null);
  }
  return map;
}

function readPlacements(content: string): RawPlacement[] {
  try {
    const parsed = parseAiJson(content || '{}') as { placements?: RawPlacement[] };
    return Array.isArray(parsed?.placements) ? parsed.placements : [];
  } catch {
    return [];
  }
}

const byName = (steps: PathStep[]): Map<string, string> =>
  new Map(steps.map((s) => [norm(s.nome), s.nodeId]));

const norm = (v: unknown): string => String(v ?? '').toLowerCase().trim();
