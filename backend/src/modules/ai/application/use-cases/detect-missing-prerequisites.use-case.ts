import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectMissingPrerequisites,
  type MissingPrerequisite,
  type PrereqNode,
  type RawPrerequisite,
} from '../../domain/services/missing-prerequisites';
import type { PrerequisiteNodesRepository } from '../../domain/ports/prerequisite-nodes-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Detecte PRÉ-REQUISITOS faltantes no grafo. Sugira 3-8 novos nós (CONCEITO ou TOPICO) que ' +
  'deveriam existir como pré-requisito dos nós listados. JSON: {"prerequisites":[{"nome":"...",' +
  '"tipo":"CONCEITO","motivo":"...","shouldConnectTo":[{"nome":"nome exato do nó existente"}]}]} — ' +
  'use o nome exato dos nós existentes em shouldConnectTo.';

/**
 * Detects prerequisite nodes that are missing from a graph and which existing
 * nodes each should connect to. Invalid model output yields no prerequisites.
 * @example detectMissingPrerequisites.execute('u1', 'g1')
 */
export class DetectMissingPrerequisitesUseCase {
  constructor(
    private readonly repo: PrerequisiteNodesRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
  ): Promise<{ prerequisites: MissingPrerequisite[] }> {
    const nodes = await this.repo.loadNodes(userId, grafoId);
    if (nodes.length === 0) return { prerequisites: [] };
    const content = await this.llm.complete({ userId, messages: buildMessages(nodes) });
    return { prerequisites: this.parse(content, nodes) };
  }

  private parse(content: string, nodes: PrereqNode[]): MissingPrerequisite[] {
    try {
      const parsed = parseAiJson(content || '{}') as { prerequisites?: RawPrerequisite[] };
      return selectMissingPrerequisites(parsed?.prerequisites ?? [], nodes);
    } catch {
      return [];
    }
  }
}

function buildMessages(nodes: PrereqNode[]): LlmMessage[] {
  const nodeList = nodes.map((n) => `nome:"${n.nome}" tipo:${n.tipo}`).join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `NÓS DO GRAFO:\n${nodeList.slice(0, 7000)}` },
  ];
}
