import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type {
  ExamProgress, ExamProgressPort, GraphExamStudyPort, ProvaAttemptDraft, ProvaDetailView, QuestaoView,
} from "../../../application/ports/graph-prova.port";
import { StudyProvaModal } from "./StudyProvaModal";

class FakeExamProgress implements ExamProgressPort {
  checkpoint: ExamProgress | null = null;
  finished: ProvaAttemptDraft | null = null;

  async read(): Promise<ExamProgress | null> {
    return this.checkpoint;
  }

  async save(_examId: string, checkpoint: ExamProgress): Promise<void> {
    this.checkpoint = checkpoint;
  }

  async finish(_examId: string, id: string, attempt: ProvaAttemptDraft): Promise<{ id: string }> {
    this.checkpoint = null;
    this.finished = attempt;
    return { id };
  }
}

class FakeExamStudy implements GraphExamStudyPort {
  progress = new FakeExamProgress();

  async getQuestao(): Promise<QuestaoView | null> {
    return null;
  }

  async getProva(): Promise<ProvaDetailView> {
    return {
      id: "exam", titulo: "Exam", descricao: null, dataCriacao: "",
      questoes: [1, 2].map((ordem) => ({
        id: `q${ordem}`, ordem, enunciado: `Prompt ${ordem}`, gabarito: "V", explicacao: null,
        tipo: "VERDADEIRO_FALSO", alternativas: null, conceitoNome: null, imagens: [],
      })),
    };
  }

  async recordProvaAttempt(): Promise<{ id: string }> {
    throw new Error("Unexpected server attempt. Expected the local progress port.");
  }
}

it("resumes an interrupted exam with its pending choice and submits both answers once", async () => {
  const study = new FakeExamStudy();
  const props = { provaId: "exam", questaoId: null, studyPort: study, onOpenChange: () => undefined };
  const initial = render(<StudyProvaModal {...props} open />);
  await screen.findByText("Prompt 1");
  expect(screen.getByText(/você pode retomar a prova depois/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Verdadeiro/ }));
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  fireEvent.click(screen.getByRole("button", { name: /Falso/ }));
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  initial.unmount();

  render(<StudyProvaModal {...props} open />);
  await screen.findByText("Questão 2 de 2");
  expect(screen.getByText("Progresso recuperado do vault.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
  await screen.findByText("Tentativa salva no vault.");
  expect(study.progress.finished).toMatchObject({
    acertos: 1,
    respostas: [{ questaoId: "q1", respostaEscolhida: "V" }, { questaoId: "q2", respostaEscolhida: "F" }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Refazer" }));
  await screen.findByText("Questão 1 de 2");
});
