import { detectDuplicates, detectDuplicatesBySimilarity, mergeDuplicates } from "@/lib/ai-api";
import type { DuplicateGroup } from "@/modules/graph/application/ports/graph-ai.port";

// Fatia de duplicatas do adapter HTTP do grafo. Saiu do graph-http.adapter porque
// aquela classe implementa 10 ports num arquivo só e bateu no teto de 500 linhas;
// detectar e fundir duplicatas é uma responsabilidade fechada em si.
// O HttpGraphAdapter herda daqui, então segue sendo o único ponto de entrada.
export class HttpGraphDuplicatesAdapter {
  detectDuplicates(grafoId: string): Promise<{ groups: DuplicateGroup[] }> {
    return detectDuplicates(grafoId);
  }

  // threshold (0..1) opcional ajusta o rigor do corte por similaridade.
  detectDuplicatesBySimilarity(
    grafoId: string,
    threshold?: number,
  ): Promise<{ groups: DuplicateGroup[] }> {
    return detectDuplicatesBySimilarity(grafoId, threshold);
  }

  mergeDuplicates(
    grafoId: string,
    keepId: string,
    deleteIds: string[],
  ): Promise<{ merged: number; edgesMoved: number }> {
    return mergeDuplicates(grafoId, keepId, deleteIds);
  }
}
