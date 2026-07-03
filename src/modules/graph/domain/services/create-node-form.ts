// Validation + payload building for the create-node flow (ASSUNTO/TOPICO/CONCEITO/
// FLASHCARD/NOTA). Pure domain logic; returns a stable error CODE (English) — the
// presentation maps it to the type-specific pt-BR message. BARALHO and PROVA have
// their own flows and are not handled here.

export interface CreateNodeFormValues {
  nome: string;
  descricao: string;
  pergunta: string;
  resposta: string;
  conteudo: string;
  tipoNota: string;
  subtipo: string;
  fonte: string;
}

export type CreateNodeError =
  | "missing-name"
  | "flashcard-missing-question"
  | "flashcard-missing-answer"
  | "nota-missing-subtype"
  | "nota-missing-source"
  | "nota-missing-content";

function validateFlashcard(form: CreateNodeFormValues): CreateNodeError | null {
  if (!form.pergunta.trim()) return "flashcard-missing-question";
  if (!form.resposta.trim()) return "flashcard-missing-answer";
  return null;
}

function validateNota(form: CreateNodeFormValues): CreateNodeError | null {
  if (!form.nome.trim()) return "missing-name";
  if (!form.subtipo) return "nota-missing-subtype";
  if (form.tipoNota === "LITERATURA" && !form.fonte.trim()) return "nota-missing-source";
  if (!form.conteudo.trim()) return "nota-missing-content";
  return null;
}

/** Validate the form for a knowledge node type. Returns the first violated rule, or null. */
export function validateCreateNodeForm(type: string, form: CreateNodeFormValues): CreateNodeError | null {
  if (type === "FLASHCARD") return validateFlashcard(form);
  if (type === "NOTA") return validateNota(form);
  return form.nome.trim() ? null : "missing-name";
}

const nameWithDescricao = (form: CreateNodeFormValues): Record<string, unknown> => ({
  nome: form.nome.trim(),
  descricao: form.descricao.trim() || null,
});

/** Build the addNodeToGraph payload for a validated form, by node type. */
export function buildCreateNodePayload(type: string, form: CreateNodeFormValues): Record<string, unknown> {
  if (type === "TOPICO") return { ...nameWithDescricao(form), assuntoId: null };
  if (type === "CONCEITO") return { ...nameWithDescricao(form), topicoId: null };
  if (type === "FLASHCARD") return { pergunta: form.pergunta.trim(), resposta: form.resposta.trim() };
  if (type === "NOTA") {
    return {
      titulo: form.nome.trim(),
      conteudo: form.conteudo.trim(),
      tipoNota: form.tipoNota,
      subtipo: form.subtipo,
      fonte: form.fonte.trim() || null,
    };
  }
  return nameWithDescricao(form);
}
