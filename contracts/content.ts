import { z } from "zod";

// Contrato das rotas de conteúdo (assunto, tópico, conceito, flashcard).
//
// Estrutural, como o de provas e pelo mesmo motivo: os domínios de curriculum e
// flashcards só têm erros de EXISTÊNCIA (AssuntoNotFoundError, TopicoNotFoundError,
// NotaNotFoundError) — nenhuma regra de formato. Sem `.min(1)`, portanto: exigir
// conteúdo aqui apertaria a API em silêncio e recusaria requisição que hoje funciona.

const nome = z.string();
const id = z.string();

export const createAssuntoContract = z.object({ nome });
export type CreateAssuntoBody = z.infer<typeof createAssuntoContract>;

export const createTopicoContract = z.object({ nome });
export type CreateTopicoBody = z.infer<typeof createTopicoContract>;

export const createConceitoContract = z.object({
  nome,
  assuntoId: id,
  topicoId: id,
});
export type CreateConceitoBody = z.infer<typeof createConceitoContract>;

export const createFlashcardContract = z.object({
  pergunta: z.string(),
  resposta: z.string(),
  conceitoId: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
});
export type CreateFlashcardBody = z.infer<typeof createFlashcardContract>;

export const updateFlashcardContract = z.object({
  pergunta: z.string().optional(),
  resposta: z.string().optional(),
  tipo: z.string().nullable().optional(),
});
export type UpdateFlashcardBody = z.infer<typeof updateFlashcardContract>;

// Cards gerados a partir de uma nota e confirmados na prévia; o conceitoId aqui é
// obrigatório, diferente da criação avulsa de flashcard.
const previewCard = z.object({
  pergunta: z.string(),
  resposta: z.string(),
  conceitoId: z.string(),
});

export const createNotaFlashcardsContract = z.object({
  flashcards: z.array(previewCard),
});
export type CreateNotaFlashcardsBody = z.infer<typeof createNotaFlashcardsContract>;
