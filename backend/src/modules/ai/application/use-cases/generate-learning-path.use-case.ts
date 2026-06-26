import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectLearningPath,
  type PathNode,
  type PathStep,
  type RawStep,
} from '../../domain/services/learning-path';
import type {
  LearningEdge,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Crie uma TRILHA DE APRENDIZADO ordenada do mais básico ao mais avançado. ' +
  'Considere as relações existentes para ordenar. JSON: {"steps":[{"nome":"nome exato do nó","motivo":"frase curta (max 15 palavras) explicando por que estudar agora"}]} — use o nome exato de cada nó.';

/**
 * Generates an ordered learning path over a graph's nodes, considering the
 * existing relations. Invalid model output yields an empty path.
 * @example generateLearningPath.execute('u1', 'g1')
 */
export class GenerateLearningPathUseCase {
  constructor(
    private readonly graph: LearningGraphRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ steps: PathStep[] }> {
    const { nodes, edges } = await this.graph.loadLearningGraph(userId, grafoId);
    if (nodes.length === 0) return { steps: [] };
    const content = await this.llm.complete({ userId, messages: buildMessages(nodes, edges) });
    return { steps: this.parseSteps(content, nodes) };
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
