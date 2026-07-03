import { describe, it, expect } from "vitest";
import { saveManualNota, type ManualNotaDraft } from "./save-manual-nota";
import type { ContentPort } from "../ports/content.port";
import type { NotesPort, CreateNotaManualInput } from "../ports/notes.port";
import type { ConceitoArvore } from "../../domain/concept-tree.types";

class FakeContentPort implements ContentPort {
  public created: string[] = [];
  private seq = 0;
  async getHierarquiaConceitos(): Promise<ConceitoArvore[]> { return []; }
  async createAssunto(nome: string): Promise<{ id: string; nome: string }> {
    this.created.push(`assunto:${nome}`); return { id: `a-${++this.seq}`, nome };
  }
  async createTopico(nome: string, assuntoId: string): Promise<{ id: string; nome: string }> {
    this.created.push(`topico:${nome}@${assuntoId}`); return { id: `t-${++this.seq}`, nome };
  }
  async createFullConcept(input: { nome: string; assuntoId: string; topicoId: string }): Promise<{ id: string; nome: string }> {
    this.created.push(`concept:${input.nome}@${input.assuntoId}/${input.topicoId}`); return { id: `c-${++this.seq}`, nome: input.nome };
  }
}

class FakeNotesPort implements NotesPort {
  public lastInput: CreateNotaManualInput | null = null;
  async getNotas() { return []; }
  async getNotaById() { return null; }
  async createNotaManual(input: CreateNotaManualInput): Promise<{ notaId: string }> {
    this.lastInput = input; return { notaId: "nota-1" };
  }
  async generateFlashcards() { return { flashcards: [] }; }
  async deleteNota() { /* noop */ }
  async deleteAllNotas() { return { count: 0 }; }
  async getFilterData() { return []; }
}

const EMPTY_DRAFT: ManualNotaDraft = {
  titulo: "T", conteudo: "C", subtipo: null, tree: [], selectedConceitoIds: [],
  notaConceitoRels: [], conceitoConceitoRels: [], pendingAssuntos: [], pendingTopics: [], pendingConcepts: [],
};

describe("saveManualNota", () => {
  it("creates staged assunto → topico → concept, then the note", async () => {
    const content = new FakeContentPort();
    const notes = new FakeNotesPort();
    const draft: ManualNotaDraft = {
      ...EMPTY_DRAFT,
      selectedConceitoIds: ["existing-1"],
      pendingAssuntos: [{ tempId: "pa1", nome: "Nova Materia" }],
      pendingTopics: [{ tempId: "pt1", nome: "Novo Topico", relsToAssuntos: [{ targetAssuntoId: "pa1", tipoRelacao: "PERTENCE_A" }] }],
      pendingConcepts: [{ tempId: "pc1", nome: "Novo Conceito", relsToTopics: [], relsToPendingTopics: [{ tempTopicoId: "pt1", tipoRelacao: "FUNDAMENTA" }] }],
    };

    const result = await saveManualNota({ content, notes }, draft);

    expect(result).toEqual({ notaId: "nota-1" });
    expect(content.created).toEqual([
      "assunto:Nova Materia",
      "topico:Novo Topico@a-1",
      "concept:Novo Conceito@a-1/t-2",
    ]);
    // existing + newly created concept id, and a DEFINE rel added for the new one
    expect(notes.lastInput?.selectedConceitoIds).toEqual(["existing-1", "c-3"]);
    expect(notes.lastInput?.notaConceitoRels).toContainEqual({ conceitoId: "c-3", tipoRelacao: "DEFINE" });
  });

  it("saves a note with only pre-existing concepts", async () => {
    const content = new FakeContentPort();
    const notes = new FakeNotesPort();
    await saveManualNota({ content, notes }, { ...EMPTY_DRAFT, selectedConceitoIds: ["x", "y"] });
    expect(content.created).toEqual([]);
    expect(notes.lastInput?.selectedConceitoIds).toEqual(["x", "y"]);
  });
});
