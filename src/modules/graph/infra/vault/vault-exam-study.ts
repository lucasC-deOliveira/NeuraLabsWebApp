import type { VaultNode } from "@/lib/vault-format";
import type { GraphExamStudyPort, ProvaAttemptDraft, ProvaDetailView, ProvaQuestaoView, QuestaoView } from "../../application/ports/graph-prova.port";
import type { VaultGraphSource } from "./graph-vault-reader";
import { makeVaultExamProgress, type VaultExamProgressFiles } from "./vault-exam-progress";

function projectQuestion(question: VaultNode): QuestaoView {
  return {
    id: question.id, enunciado: question.enunciado ?? "",
    tipo: question.tipoQuestao === "VERDADEIRO_FALSO" ? "VERDADEIRO_FALSO" : "MULTIPLA_ESCOLHA",
    alternativas: question.alternativas ?? null, gabarito: question.gabarito ?? "",
    explicacao: question.explicacao ?? null, conceitoNome: null,
  };
}

function examQuestions(exam: VaultNode, nodes: ReadonlyMap<string, VaultNode>): ProvaQuestaoView[] {
  const linked = new Set(exam.questaoIds ?? exam.relacoes.filter(({ rel }) => rel === "CONTEM").map(({ alvo }) => alvo));
  return [...linked].flatMap((id, index): ProvaQuestaoView[] => {
    const node = nodes.get(id);
    if (node?.tipo !== "QUESTION") return [];
    return [{ ...projectQuestion(node), ordem: index + 1, imagens: [] }];
  });
}

function projectExam(exam: VaultNode, nodes: ReadonlyMap<string, VaultNode>): ProvaDetailView {
  const questions = examQuestions(exam, nodes);
  if (!exam.questaoIds && questions.length === 0) {
    throw new Error("Baixe o grafo novamente para carregar o vínculo entre esta prova e suas questões.");
  }
  if (exam.questaoIds && questions.length !== new Set(exam.questaoIds).size) {
    throw new Error("Há questões desta prova que não estão no vault. Baixe a prova completa antes de estudar.");
  }
  return {
    id: exam.id, titulo: exam.titulo ?? exam.id, descricao: exam.descricao ?? null, dataCriacao: "",
    questoes: questions,
  };
}

/** Reads downloaded exam content and persists finished attempts in the same vault graph.
 * @example const study = makeVaultExamStudy(graphId, source, desktop.vault)
 */
export function makeVaultExamStudy(
  graphId: string, source: VaultGraphSource, files: VaultExamProgressFiles, nextId = (): string => crypto.randomUUID(),
): GraphExamStudyPort {
  const nodes = new Map(source.entries.map(({ node }) => [node.id, node]));
  return {
    async getQuestao(id): Promise<QuestaoView | null> {
      const node = nodes.get(id);
      return node?.tipo === "QUESTION" ? projectQuestion(node) : null;
    },
    async getProva(id): Promise<ProvaDetailView | null> {
      const node = nodes.get(id);
      return node?.tipo === "PROVA" ? projectExam(node, nodes) : null;
    },
    recordProvaAttempt: (id, attempt) => writeAttempt(files, source.directory, graphId, id, nextId(), attempt),
    progress: makeVaultExamProgress(files, source.directory, (id, attemptId, attempt) =>
      writeAttempt(files, source.directory, graphId, id, attemptId, attempt)),
  };
}

async function writeAttempt(
  files: VaultExamProgressFiles, directory: string, graphId: string, examId: string, id: string, attempt: ProvaAttemptDraft,
): Promise<{ id: string }> {
  const entry = { version: 1, id, graphId, provaId: examId, completedAt: new Date().toISOString(), ...attempt };
  const result = await files.writeFile(directory, `.neuralabs-exam-attempts/${id}.json`, JSON.stringify(entry, null, 2) + "\n");
  if (!result.ok) throw new Error("Não foi possível salvar a tentativa no vault.");
  return { id };
}
