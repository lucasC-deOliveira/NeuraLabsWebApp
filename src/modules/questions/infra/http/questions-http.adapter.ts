// HTTP adapter (infra) — o ÚNICO ponto do módulo questions que toca @/lib/questions-api.
// Implementa o QuestionsPort delegando ao client existente (Anti-Corruption Layer).
import {
  listQuestoes,
  getQuestao,
  createQuestao,
  updateQuestao,
  deleteQuestao,
} from "@/lib/questions-api";
import type { QuestionsPort } from "../../application/ports/questions.port";
import type { QuestaoListItem, CreateQuestaoInput } from "../../domain/questao.types";

export class HttpQuestionsAdapter implements QuestionsPort {
  listQuestoes(): Promise<QuestaoListItem[]> {
    return listQuestoes();
  }

  getQuestao(id: string): Promise<QuestaoListItem> {
    return getQuestao(id);
  }

  createQuestao(data: CreateQuestaoInput): Promise<{ questaoId: string }> {
    return createQuestao(data);
  }

  updateQuestao(id: string, data: Partial<CreateQuestaoInput>): Promise<{ success: boolean }> {
    return updateQuestao(id, data);
  }

  deleteQuestao(id: string): Promise<{ success: boolean }> {
    return deleteQuestao(id);
  }
}
