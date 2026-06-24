import type {
  GraphImportRepository,
  ImportResult,
} from '../../domain/ports/graph-import-repository';

/**
 * Imports a graph from a JSON payload (nodes + edges), reusing entities by name.
 * @example importGraph.execute('u1', 'g1', payload)
 */
export class ImportGraphUseCase {
  constructor(private readonly imports: GraphImportRepository) {}

  execute(userId: string, grafoId: string, payload: unknown): Promise<ImportResult> {
    return this.imports.importFromJson(userId, grafoId, payload);
  }
}
