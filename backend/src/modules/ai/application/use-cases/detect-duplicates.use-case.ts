import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectDuplicateGroups,
  type DuplicateGroup,
  type RawGroup,
} from '../../domain/services/duplicate-groups';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Você detecta DUPLICATAS semânticas em grafos de conhecimento. ' +
  'REGRA FUNDAMENTAL: só agrupe nós do MESMO TIPO (ASSUNTO com ASSUNTO, TOPICO com TOPICO, CONCEITO com CONCEITO). ' +
  'NUNCA agrupe tipos diferentes, mesmo que tenham nomes parecidos.\n' +
  'Dois nós do mesmo tipo são duplicatas se representam o MESMO conceito, independentemente de:\n' +
  '- idioma (português ↔ inglês): "Machine Learning" = "Aprendizado de Máquina", "Array" = "Vetor", "Binary Tree" = "Árvore Binária"\n' +
  '- variação de nome: "Fotossíntese" = "Processo de Fotossíntese", "ML" = "Machine Learning"\n' +
  '- abreviação/sigla: "POO" = "Programação Orientada a Objetos", "OOP" = "Object-Oriented Programming"\n' +
  '- tradução parcial: "Stack" = "Pilha", "Queue" = "Fila", "Hash Table" = "Tabela Hash"\n' +
  'Seja RIGOROSO e EXAUSTIVO: liste absolutamente TODOS os grupos de duplicatas, incluindo pares PT↔EN. ' +
  'Use os índices numéricos [N] do input para identificar os nós. ' +
  'JSON: {"groups":[{"indices":[0,3],"sugestao":"manter [0] — razão breve"}]}';

/**
 * Detects semantic duplicate nodes in a graph. The model references nodes by
 * numeric index to save tokens; the result is resolved and validated.
 * @example detectDuplicates.execute('u1', 'g1')
 */
export class DetectDuplicatesUseCase {
  constructor(
    private readonly nodes: DuplicateNodesRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ groups: DuplicateGroup[] }> {
    const nodes = await this.nodes.loadGraphNodes(userId, grafoId);
    return { groups: await this.detectAmong(userId, nodes) };
  }

  /**
   * Finds duplicate groups AMONG a given node list (not the whole graph). The
   * hybrid detector reuses this to confirm only the embedding-shortlisted
   * candidates, so the LLM never sees the full graph.
   * @example detect.detectAmong('u1', shortlistNodes)
   */
  async detectAmong(userId: string, nodes: DuplicateGraphNode[]): Promise<DuplicateGroup[]> {
    if (nodes.length < 2) return [];
    const content = await this.llm.complete({
      userId,
      maxTokens: 6000,
      messages: buildMessages(nodes),
    });
    const parsed = parseAiJson(content || '{}') as { groups?: RawGroup[] };
    return selectDuplicateGroups(parsed?.groups ?? [], nodes);
  }
}

function buildMessages(nodes: DuplicateGraphNode[]): LlmMessage[] {
  const nodeList = nodes
    .map((n, i) => `[${i}] ${n.tipo}: "${n.nome}"${n.desc ? ` — ${n.desc.slice(0, 100)}` : ''}`)
    .join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `NÓS DO GRAFO:\n${nodeList.slice(0, 10000)}` },
  ];
}
