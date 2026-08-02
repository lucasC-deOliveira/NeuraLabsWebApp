import { describe, it, expect } from "vitest";
import {
  createEditalContract,
  createProvaContract,
  createProvaFromParsedContract,
  linkEditalContract,
  provaAttemptContract,
  updateProvaContract,
} from "@contracts/provas";

const questao = {
  numero: 1,
  enunciado: "Qual a capital?",
  tipo: "MULTIPLA_ESCOLHA",
  alternativas: [{ letra: "A", texto: "Brasília" }],
  gabarito: "A",
  explicacao: null,
};

describe("createProvaContract", () => {
  it("aceita uma prova com os campos declarados", () => {
    expect(createProvaContract.safeParse({ titulo: "ENEM", questaoIds: ["q1"] }).success).toBe(true);
  });

  it("recusa questaoIds que não é lista, em vez de deixar estourar no Prisma", () => {
    expect(createProvaContract.safeParse({ titulo: "ENEM", questaoIds: "q1" }).success).toBe(false);
  });

  it("exige que questaoIds venha", () => {
    expect(createProvaContract.safeParse({ titulo: "ENEM" }).success).toBe(false);
  });

  // O backend de provas não cobra conteúdo em campo nenhum. Apertar aqui recusaria
  // requisição que hoje funciona — a decisão de exigir é de produto, não do contrato.
  it("não aperta o título além do que o backend cobra hoje", () => {
    expect(createProvaContract.safeParse({ titulo: "", questaoIds: [] }).success).toBe(true);
  });
});

describe("updateProvaContract", () => {
  it("aceita um patch parcial", () => {
    expect(updateProvaContract.safeParse({}).success).toBe(true);
    expect(updateProvaContract.safeParse({ titulo: "Outro" }).success).toBe(true);
  });

  it("ainda checa o tipo do que veio", () => {
    expect(updateProvaContract.safeParse({ questaoIds: 3 }).success).toBe(false);
  });
});

describe("createProvaFromParsedContract", () => {
  it("aceita as questões vindas do parse", () => {
    const body = { titulo: "ENEM", questoes: [questao] };
    expect(createProvaFromParsedContract.safeParse(body).success).toBe(true);
  });

  it("aceita alternativas nulas (questão de verdadeiro/falso)", () => {
    const vf = { ...questao, tipo: "VERDADEIRO_FALSO", alternativas: null };
    expect(createProvaFromParsedContract.safeParse({ titulo: "T", questoes: [vf] }).success).toBe(true);
  });

  it("recusa um tipo de questão desconhecido", () => {
    const ruim = { ...questao, tipo: "DISSERTATIVA" };
    expect(createProvaFromParsedContract.safeParse({ titulo: "T", questoes: [ruim] }).success).toBe(false);
  });

  it("aceita as figuras em base64 que atravessam parse → revisão → criação", () => {
    const comImagem = { ...questao, imagens: [{ mimetype: "image/png", base64: "iVBOR", alternativa: null }] };
    expect(createProvaFromParsedContract.safeParse({ titulo: "T", questoes: [comImagem] }).success).toBe(true);
  });

  it("aponta a questão culpada dentro da lista", () => {
    const body = { titulo: "T", questoes: [questao, { ...questao, numero: "dois" }] };
    const parsed = createProvaFromParsedContract.safeParse(body);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(["questoes", 1, "numero"]);
  });
});

describe("provaAttemptContract", () => {
  const tentativa = { acertos: 3, total: 5, tempoTotalMs: 1000, respostas: [] };

  it("aceita uma tentativa completa", () => {
    const resposta = { questaoId: "q1", respostaEscolhida: "A", acertou: true, tempoRespostaMs: null };
    expect(provaAttemptContract.safeParse({ ...tentativa, respostas: [resposta] }).success).toBe(true);
  });

  it("recusa contagem que não é número — o ganho principal desta rota", () => {
    expect(provaAttemptContract.safeParse({ ...tentativa, acertos: "muitos" }).success).toBe(false);
  });

  // A exigência de ao menos uma resposta segue no RecordProvaAttemptUseCase, com a
  // mensagem do EmptyAttemptError. Repetir aqui mudaria o erro que o usuário vê.
  it("deixa a lista vazia passar, para o domínio recusar com a mensagem dele", () => {
    expect(provaAttemptContract.safeParse(tentativa).success).toBe(true);
  });
});

describe("createEditalContract / linkEditalContract", () => {
  it("exige os campos que o tipo declara", () => {
    expect(createEditalContract.safeParse({ titulo: "E", programa: "P", grafoId: "g1" }).success).toBe(true);
    expect(createEditalContract.safeParse({ titulo: "E", programa: "P" }).success).toBe(false);
  });

  it("aceita o vínculo opcional com a prova e os conceitos cobertos", () => {
    const body = { titulo: "E", programa: "P", grafoId: "g1", provaId: "p1", conceitoNodeIds: ["c1"] };
    expect(createEditalContract.safeParse(body).success).toBe(true);
  });

  it("exige as duas pontas do vínculo edital–prova", () => {
    expect(linkEditalContract.safeParse({ provaId: "p1" }).success).toBe(false);
    expect(linkEditalContract.safeParse({ provaId: "p1", grafoId: "g1" }).success).toBe(true);
  });
});
