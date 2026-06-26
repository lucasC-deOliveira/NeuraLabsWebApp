import type { ChatContextNode } from '../services/chat-context';

// Read port: the graph's TOPICO/CONCEITO/NOTA nodes (with content) used to ground
// a graph chat, ordered TOPICO → CONCEITO → NOTA.
export interface ChatNodesRepository {
  loadChatNodes(userId: string, grafoId: string): Promise<ChatContextNode[]>;
}

export const CHAT_NODES_REPOSITORY = Symbol('CHAT_NODES_REPOSITORY');
