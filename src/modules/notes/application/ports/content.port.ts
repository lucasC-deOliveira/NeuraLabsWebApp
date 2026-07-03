// Port for the concept hierarchy (assunto/topico/conceito) used by the manual
// note editor. The infra/ adapter implements it over @/lib/content-api (the
// slice notes needs).
import type { ConceitoArvore } from "../../domain/concept-tree.types";

export interface ContentPort {
  getHierarquiaConceitos(): Promise<ConceitoArvore[]>;
  createAssunto(nome: string): Promise<{ id: string; nome: string }>;
  createTopico(nome: string, assuntoId: string): Promise<{ id: string; nome: string }>;
  createFullConcept(input: { nome: string; assuntoId: string; topicoId: string }): Promise<{ id: string; nome: string }>;
}
