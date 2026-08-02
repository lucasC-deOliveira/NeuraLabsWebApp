import { z } from "zod";

// Contrato das rotas de baralho. As mensagens são pt-BR porque o servidor as
// devolve no 400 e elas chegam ao usuário dentro do campo do formulário.

/** Teto do título aceito pela API. Antes vivia só no domínio do backend. */
export const BARALHO_TITULO_MAX = 120;

export const baralhoTitulo = z
  .string()
  .trim()
  .min(1, "Informe o título do baralho")
  .max(BARALHO_TITULO_MAX, `O título deve ter no máximo ${BARALHO_TITULO_MAX} caracteres`);

const flashcardIds = z.array(z.string()).default([]);

export const createBaralhoContract = z.object({
  titulo: baralhoTitulo,
  flashcardIds,
});
export type CreateBaralhoBody = z.infer<typeof createBaralhoContract>;

export const renameBaralhoContract = z.object({
  titulo: baralhoTitulo,
});
export type RenameBaralhoBody = z.infer<typeof renameBaralhoContract>;

export const addCardsToBaralhoContract = z.object({
  flashcardIds,
});
export type AddCardsToBaralhoBody = z.infer<typeof addCardsToBaralhoContract>;

// O formato do arquivo importado é validado no domínio (parseImportedBaralhos),
// que aceita dois formatos distintos — aqui só garantimos que veio alguma coisa.
export const importBaralhosContract = z.object({
  baralhos: z.unknown(),
});
export type ImportBaralhosBody = z.infer<typeof importBaralhosContract>;

// ---- Respostas ----
// Todos com .passthrough(): um campo novo no backend NÃO pode quebrar o cliente.
// Descrevem o JSON cru — dataCriacao chega como string e vira Date na fachada.

const baralhoOrigin = z
  .object({
    grafoId: z.string(),
    nome: z.string(),
  })
  .passthrough();

export const baralhoListItemResponse = z
  .object({
    id: z.string(),
    titulo: z.string(),
    totalCards: z.number(),
    novos: z.number(),
    aprender: z.number(),
    revisar: z.number(),
    dataCriacao: z.string(),
    origens: z.array(baralhoOrigin),
  })
  .passthrough();

export const baralhoListResponse = z.array(baralhoListItemResponse);

const conceptTag = z
  .object({
    conceito: z.string(),
    topico: z.string(),
    topicoId: z.string(),
    assunto: z.string(),
    assuntoId: z.string(),
  })
  .passthrough();

const baralhoCard = z
  .object({
    id: z.string(),
    pergunta: z.string(),
    resposta: z.string(),
    tipo: z.string().nullable(),
    conceito: z.string(),
    conceitosConectados: z.array(conceptTag),
  })
  .passthrough();

export const baralhoDetailResponse = z
  .object({
    id: z.string(),
    titulo: z.string(),
    dataCriacao: z.string(),
    origens: z.array(baralhoOrigin),
    cards: z.array(baralhoCard),
  })
  .passthrough();
