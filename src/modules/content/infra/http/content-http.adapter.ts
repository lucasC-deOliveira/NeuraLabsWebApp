// ACL over @/lib/content-api (the concept-hierarchy slice notes needs).
import {
  getHierarquiaConceitos,
  createAssunto,
  createTopico,
  createFullConcept,
} from "@/lib/content-api";
import type { ContentPort } from "../../application/ports/content.port";
import type { ConceitoArvore } from "../../domain/concept-tree.types";

export class HttpContentAdapter implements ContentPort {
  getHierarquiaConceitos(): Promise<ConceitoArvore[]> {
    return getHierarquiaConceitos();
  }

  createAssunto(nome: string): Promise<{ id: string; nome: string }> {
    return createAssunto(nome);
  }

  createTopico(nome: string, assuntoId: string): Promise<{ id: string; nome: string }> {
    return createTopico(nome, assuntoId);
  }

  createFullConcept(input: { nome: string; assuntoId: string; topicoId: string }): Promise<{ id: string; nome: string }> {
    return createFullConcept(input);
  }
}
