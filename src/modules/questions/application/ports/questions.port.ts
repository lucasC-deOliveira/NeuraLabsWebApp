// Port (application boundary) for the questions CRUD over the HTTP edge.
// Only infra/ implements it (ACL sobre @/lib/questions-api). Sem React, sem @/lib aqui.
import type { QuestaoListItem, CreateQuestaoInput } from "../../domain/questao.types";

export interface QuestionsPort {
  listQuestoes(): Promise<QuestaoListItem[]>;
  getQuestao(id: string): Promise<QuestaoListItem>;
  createQuestao(data: CreateQuestaoInput): Promise<{ questaoId: string }>;
  updateQuestao(id: string, data: Partial<CreateQuestaoInput>): Promise<{ success: boolean }>;
  deleteQuestao(id: string): Promise<{ success: boolean }>;
}
