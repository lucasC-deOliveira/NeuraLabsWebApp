// ACL over @/lib/ai-api (the note-extraction slice).
import { analyzeRawText, saveSelectedNotas } from "@/lib/ai-api";
import type { NotaAiPort, NotaCandidata } from "../../application/ports/nota-ai.port";

export class HttpNotaAiAdapter implements NotaAiPort {
  analyzeRawText(rawText: string): Promise<{ candidatas: NotaCandidata[] }> {
    return analyzeRawText(rawText);
  }

  saveSelectedNotas(
    candidatas: Array<{ titulo: string; conteudo: string }>,
  ): Promise<{ notaIds: string[] }> {
    return saveSelectedNotas(candidatas);
  }
}
