import { describe, it, expect } from "vitest";
import {
  createConceitoContract,
  createFlashcardContract,
  createNotaFlashcardsContract,
  updateFlashcardContract,
} from "@contracts/content";

describe("createConceitoContract", () => {
  it("exige os três campos que o tipo declara", () => {
    expect(createConceitoContract.safeParse({ nome: "Mitose", assuntoId: "a1", topicoId: "t1" }).success).toBe(true);
    expect(createConceitoContract.safeParse({ nome: "Mitose", assuntoId: "a1" }).success).toBe(false);
  });

  it("recusa id que não é string", () => {
    expect(createConceitoContract.safeParse({ nome: "M", assuntoId: 1, topicoId: "t1" }).success).toBe(false);
  });
});

describe("createFlashcardContract", () => {
  it("aceita um card com conceito e tipo nulos, como a API permite", () => {
    const card = { pergunta: "p", resposta: "r", conceitoId: null, tipo: null };
    expect(createFlashcardContract.safeParse(card).success).toBe(true);
  });

  it("aceita um card sem conceito nem tipo", () => {
    expect(createFlashcardContract.safeParse({ pergunta: "p", resposta: "r" }).success).toBe(true);
  });

  it("exige pergunta e resposta como strings", () => {
    expect(createFlashcardContract.safeParse({ pergunta: "p" }).success).toBe(false);
    expect(createFlashcardContract.safeParse({ pergunta: "p", resposta: 3 }).success).toBe(false);
  });

  // curriculum e flashcards só têm erros de existência — nenhuma regra de formato.
  it("não aperta o conteúdo além do que o backend cobra hoje", () => {
    expect(createFlashcardContract.safeParse({ pergunta: "", resposta: "" }).success).toBe(true);
  });
});

describe("updateFlashcardContract", () => {
  it("aceita patch parcial e vazio", () => {
    expect(updateFlashcardContract.safeParse({}).success).toBe(true);
    expect(updateFlashcardContract.safeParse({ resposta: "nova" }).success).toBe(true);
  });

  it("ainda checa o tipo do que veio", () => {
    expect(updateFlashcardContract.safeParse({ pergunta: 42 }).success).toBe(false);
  });
});

describe("createNotaFlashcardsContract", () => {
  const card = { pergunta: "p", resposta: "r", conceitoId: "c1" };

  it("aceita a lista de cards confirmados na prévia", () => {
    expect(createNotaFlashcardsContract.safeParse({ flashcards: [card] }).success).toBe(true);
  });

  // Aqui o conceitoId é obrigatório, diferente da criação avulsa de flashcard.
  it("exige o conceito de cada card gerado a partir da nota", () => {
    const semConceito = { pergunta: "p", resposta: "r" };
    expect(createNotaFlashcardsContract.safeParse({ flashcards: [semConceito] }).success).toBe(false);
  });

  it("aponta o card culpado dentro da lista", () => {
    const parsed = createNotaFlashcardsContract.safeParse({ flashcards: [card, { pergunta: "p" }] });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path[1]).toBe(1);
  });
});
