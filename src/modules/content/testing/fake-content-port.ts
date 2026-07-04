// Reusable named fake of ContentPort for use-case specs (notes, flashcards, …).
// Returns sequential ids (a-N / t-N / c-N) and records each create call in
// `created` for order/argument assertions.
import type { ContentPort } from "../application/ports/content.port";
import type { ConceitoArvore } from "../domain/concept-tree.types";

export class FakeContentPort implements ContentPort {
  public created: string[] = [];
  private seq = 0;

  async getHierarquiaConceitos(): Promise<ConceitoArvore[]> {
    return [];
  }

  async createAssunto(nome: string): Promise<{ id: string; nome: string }> {
    this.created.push(`assunto:${nome}`);
    return { id: `a-${++this.seq}`, nome };
  }

  async createTopico(nome: string, assuntoId: string): Promise<{ id: string; nome: string }> {
    this.created.push(`topico:${nome}@${assuntoId}`);
    return { id: `t-${++this.seq}`, nome };
  }

  async createFullConcept(input: { nome: string; assuntoId: string; topicoId: string }): Promise<{ id: string; nome: string }> {
    this.created.push(`concept:${input.nome}@${input.assuntoId}/${input.topicoId}`);
    return { id: `c-${++this.seq}`, nome: input.nome };
  }
}
