import type { GraphRepository } from '../../domain/ports/graph-repository';

/**
 * Creates a knowledge graph, defaulting a blank name to "Novo grafo".
 * @example createGraph.execute('u1', '  ', 'desc') // → { id: 'g-1' }
 */
export class CreateGraphUseCase {
  constructor(private readonly graphs: GraphRepository) {}

  async execute(userId: string, nome: string, descricao?: string): Promise<{ id: string }> {
    const name = nome.trim() || 'Novo grafo';
    return this.graphs.create(userId, name, descricao ?? null);
  }
}
