import { describe, it, expect } from "vitest";
import {
  GRADES,
  configAiContract,
  createNotaContract,
  createQuestaoContract,
  feynmanSessionContract,
  savePlanContract,
  submitReviewContract,
  syncVaultLogContract,
  synthesizeContract,
  updateQuestaoContract,
} from "@contracts/estudo-e-anexos";

describe("submitReviewContract", () => {
  it("aceita as notas do Value Object Grade", () => {
    for (const grade of GRADES) {
      expect(submitReviewContract.safeParse({ flashcardId: "f1", grade }).success, grade).toBe(true);
    }
  });

  it("recusa uma nota fora do conjunto, como o Grade faria", () => {
    expect(submitReviewContract.safeParse({ flashcardId: "f1", grade: "perfect" }).success).toBe(false);
  });

  // O caminho legado (antes dos 4 botões) manda `acertou` e nenhuma nota.
  it("aceita a revisão legada, sem grade", () => {
    const legado = { flashcardId: "f1", acertou: true, nivelConfianca: 3, tempoResposta: 900 };
    expect(submitReviewContract.safeParse(legado).success).toBe(true);
  });

  it("exige o flashcard", () => {
    expect(submitReviewContract.safeParse({ grade: "good" }).success).toBe(false);
  });
});

describe("syncVaultLogContract", () => {
  it("aceita uma sessão ainda aberta (endedAt nulo)", () => {
    const body = { sessions: [{ startedAt: "2026-01-01T00:00:00Z", endedAt: null, revisoes: [] }] };
    expect(syncVaultLogContract.safeParse(body).success).toBe(true);
  });

  it("recusa revisão sem o flashcard", () => {
    const body = { sessions: [{ startedAt: "x", endedAt: null, revisoes: [{ revisadoEm: "y" }] }] };
    expect(syncVaultLogContract.safeParse(body).success).toBe(false);
  });
});

describe("savePlanContract", () => {
  it("aceita um plano vazio e um completo", () => {
    expect(savePlanContract.safeParse({}).success).toBe(true);
    expect(savePlanContract.safeParse({ metaValor: 20, dataAlvo: null, grafoIds: ["g1"] }).success).toBe(true);
  });

  it("ainda checa o tipo do que veio", () => {
    expect(savePlanContract.safeParse({ grafoIds: "g1" }).success).toBe(false);
  });
});

// O controller do Feynman TOLERA lixo: parseFeynmanAngulo cai em 'SIMPLES' e
// toSessionExplanations descarta item sem texto ou sem clareza. Um contrato estrito
// recusaria o que hoje é filtrado em silêncio — por isso tudo é opcional aqui.
describe("feynmanSessionContract", () => {
  it("aceita explicações incompletas, que o controller filtra depois", () => {
    const body = { alvoId: "c1", explicacoes: [{ angulo: "SIMPLES" }, { texto: "só texto" }] };
    expect(feynmanSessionContract.safeParse(body).success).toBe(true);
  });

  it("aceita um ângulo desconhecido, que o parse normaliza para SIMPLES", () => {
    expect(feynmanSessionContract.safeParse({ explicacoes: [{ angulo: "INVENTADO" }] }).success).toBe(true);
  });

  it("mesmo assim recusa a lista que não é lista", () => {
    expect(feynmanSessionContract.safeParse({ explicacoes: "nada" }).success).toBe(false);
  });
});

describe("createQuestaoContract / updateQuestaoContract", () => {
  const questao = { tipo: "MULTIPLA_ESCOLHA", enunciado: "e", gabarito: "A" };

  it("aceita uma questão com alternativas", () => {
    const body = { ...questao, alternativas: [{ letra: "A", texto: "t" }] };
    expect(createQuestaoContract.safeParse(body).success).toBe(true);
  });

  it("recusa um tipo de questão desconhecido", () => {
    expect(createQuestaoContract.safeParse({ ...questao, tipo: "DISSERTATIVA" }).success).toBe(false);
  });

  it("aceita patch parcial na edição", () => {
    expect(updateQuestaoContract.safeParse({ gabarito: "B" }).success).toBe(true);
  });
});

describe("createNotaContract", () => {
  it("aceita nota com subtipo nulo", () => {
    expect(createNotaContract.safeParse({ titulo: "t", conteudo: "c", subtipo: null }).success).toBe(true);
  });

  it("exige título e conteúdo", () => {
    expect(createNotaContract.safeParse({ titulo: "t" }).success).toBe(false);
  });
});

describe("configAiContract / synthesizeContract", () => {
  it("exige os três campos da configuração de IA", () => {
    expect(configAiContract.safeParse({ apiKey: "k", baseUrl: "u", modelo: "m" }).success).toBe(true);
    expect(configAiContract.safeParse({ apiKey: "k", baseUrl: "u" }).success).toBe(false);
  });

  it("exige o texto a sintetizar e aceita voz e velocidade opcionais", () => {
    expect(synthesizeContract.safeParse({ text: "olá" }).success).toBe(true);
    expect(synthesizeContract.safeParse({ text: "olá", voice: "pt-BR", rate: 1.2 }).success).toBe(true);
    expect(synthesizeContract.safeParse({ voice: "pt-BR" }).success).toBe(false);
  });
});
