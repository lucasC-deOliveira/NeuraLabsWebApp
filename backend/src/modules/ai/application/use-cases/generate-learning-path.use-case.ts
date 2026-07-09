import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectLearningPath,
  type PathNode,
  type PathStep,
  type RawStep,
} from '../../domain/services/learning-path';
import { prioritizeLearningPath } from '../../domain/services/prioritize-learning-path';
import { prereqLinks } from '../../domain/services/prereq-links';
import {
  rankConceitoImportance,
  type ImportanceRow,
} from '../../domain/services/conceito-importance';
import type {
  LearningEdge,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type { ConceitoImportanceSource } from '../../domain/ports/conceito-importance-source';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const IMPORTANCE_PROVA_WEIGHT = 0.6;

const SYSTEM_PROMPT =
  'Crie uma TRILHA DE APRENDIZADO ordenada do mais básico ao mais avançado. ' +
  'Considere as relações existentes para ordenar. JSON: {"steps":[{"nome":"nome exato do nó","motivo":"frase curta (max 15 palavras) explicando por que estudar agora"}]} — use o nome exato de cada nó.';

/**
 * Generates an ordered learning path over a graph's nodes. The LLM proposes a
 * prerequisite-respecting order; when an importance source is provided, a
 * deterministic re-rank then front-loads the most important concepts (past-exam
 * frequency × edital emphasis) without violating prerequisites. Invalid model
 * output yields an empty path.
 * @example generateLearningPath.execute('u1', 'g1')
 */
export class GenerateLearningPathUseCase {
  constructor(
    private readonly graph: LearningGraphRepository,
    private readonly llm: LlmPort,
    private readonly importance?: ConceitoImportanceSource,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ steps: PathStep[] }> {
    const { nodes, edges } = await this.graph.loadLearningGraph(userId, grafoId);
    if (nodes.length === 0) return { steps: [] };
    const content = await this.llm.complete({ userId, messages: buildMessages(nodes, edges) });
    const steps = this.parseSteps(content, nodes);
    return { steps: await this.prioritize(userId, grafoId, steps, edges) };
  }

  // Re-rank by importance (prereqs kept as a hard constraint); no-op without an
  // importance source or steps.
  private async prioritize(
    userId: string,
    grafoId: string,
    steps: PathStep[],
    edges: LearningEdge[],
  ): Promise<PathStep[]> {
    if (!this.importance || steps.length === 0) return steps;
    const rows = await this.importance.load(userId, grafoId);
    const prioritized = prioritizeLearningPath(steps, prereqLinks(edges), importanceMap(rows));
    const provaByNode = new Map(rows.map((r) => [r.conceitoId, r.provaFreq]));
    return prioritized.map((s) => ({ ...s, provaFreq: provaByNode.get(s.nodeId) ?? 0 }));
  }

  private parseSteps(content: string, nodes: PathNode[]): PathStep[] {
    try {
      const parsed = parseAiJson(content || '{}') as { steps?: RawStep[] };
      return selectLearningPath(parsed?.steps ?? [], nodes);
    } catch {
      return [];
    }
  }
}

function importanceMap(rows: ImportanceRow[]): Map<string, number> {
  const ranked = rankConceitoImportance(rows, IMPORTANCE_PROVA_WEIGHT);
  return new Map(ranked.map((r) => [r.conceitoId, r.importancia]));
}

function buildMessages(nodes: PathNode[], edges: LearningEdge[]): LlmMessage[] {
  const nodeList = nodes.map((n) => `tipo:${n.tipo} nome:"${n.nome}"`).join('\n');
  const edgeList = edges.map((e) => `${e.origem}→${e.destino} (${e.relacao})`).join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `NÓS:\n${nodeList.slice(0, 6000)}\n\nRELAÇÕES EXISTENTES:\n${edgeList.slice(0, 2000)}`,
    },
  ];
}
