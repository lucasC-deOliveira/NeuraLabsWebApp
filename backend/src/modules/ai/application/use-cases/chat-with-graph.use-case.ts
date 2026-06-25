import { buildChatContext, type ChatContextNode } from '../../domain/services/chat-context';
import {
  extractChatAnswer,
  type ChatAnswer,
  type ChatNode,
} from '../../domain/services/chat-answer';
import type { ChatNodesRepository } from '../../domain/ports/chat-nodes-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

function systemPrompt(ctx: string): string {
  return (
    'Responda a pergunta do usuário baseado EXCLUSIVAMENTE no grafo de conhecimento abaixo. ' +
    'Seja direto. Responda em Markdown. Ao FINAL da resposta, em uma linha separada, inclua ' +
    'EXATAMENTE este JSON (sem markdown): {"referencedNodeIds":["id1","id2"]}\n\n' +
    `GRAFO:\n${ctx.slice(0, 8000)}`
  );
}

/**
 * Answers a question grounded exclusively in the graph, returning the Markdown
 * answer plus the nodes the model referenced.
 * @example chat.execute('u1', 'g1', 'O que é mitose?', [])
 */
export class ChatWithGraphUseCase {
  constructor(
    private readonly repo: ChatNodesRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    question: string,
    history: ChatTurn[] = [],
  ): Promise<ChatAnswer> {
    const nodes = await this.repo.loadChatNodes(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      messages: buildMessages(nodes, history, question),
    });
    return extractChatAnswer(content, referenceableNodes(nodes));
  }
}

// Only TOPICO/CONCEITO nodes can be cited back as referenced nodes.
function referenceableNodes(nodes: ChatContextNode[]): ChatNode[] {
  return nodes
    .filter((n) => n.tipo === 'TOPICO' || n.tipo === 'CONCEITO')
    .map((n) => ({ id: n.id, nome: n.nome, tipo: n.tipo }));
}

function buildMessages(
  nodes: ChatContextNode[],
  history: ChatTurn[],
  question: string,
): LlmMessage[] {
  return [
    { role: 'system', content: systemPrompt(buildChatContext(nodes)) },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];
}
