import type { ImproveFlashcardOperation } from "@/modules/graph/application/ports/graph-ai.port";

// As melhorias que o usuário pode escolher no "Melhorar com IA" (flashcard e questão).
export interface ImproveOptionMeta {
  id: ImproveFlashcardOperation;
  label: string;
  desc: string;
}

export const IMPROVE_OPS: ImproveOptionMeta[] = [
  {
    id: "format",
    label: "Formatação e estrutura",
    desc: "Organiza em parágrafos e listas, remove ruído. Não muda o conteúdo.",
  },
  { id: "markdown", label: "Estilo Markdown", desc: "Realça termos-chave com negrito, código e listas." },
  {
    id: "content",
    label: "Melhorar o conteúdo",
    desc: "Corrige erros e melhora a clareza, fiel ao conteúdo original.",
  },
];

export const DEFAULT_IMPROVE_OPS: ImproveFlashcardOperation[] = ["format", "markdown"];
