import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBaralhos, getBaralho } from "./baralhos-api";

// Mesma abordagem do api.spec: roda no projeto "node", então stubbamos os globais
// de DOM em vez de usar jsdom.
const httpResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify(body)),
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const listItem = {
  id: "b1",
  titulo: "Biologia",
  totalCards: 3,
  novos: 1,
  aprender: 1,
  revisar: 1,
  dataCriacao: "2026-01-02T03:04:05.000Z",
  origens: [{ grafoId: "g1", nome: "Grafo" }],
};

describe("getBaralhos", () => {
  it("converte dataCriacao em Date", async () => {
    fetchMock.mockResolvedValue(httpResponse([listItem]));

    const [baralho] = await getBaralhos();

    expect(baralho.dataCriacao).toBeInstanceOf(Date);
    expect(baralho.dataCriacao.toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  it("recusa uma lista fora do contrato em vez de entregar campo indefinido", async () => {
    fetchMock.mockResolvedValue(httpResponse([{ ...listItem, totalCards: "três" }]));

    await expect(getBaralhos()).rejects.toThrow(/fora do contrato/);
  });

  it("aceita campo novo vindo do backend", async () => {
    fetchMock.mockResolvedValue(httpResponse([{ ...listItem, campoNovo: 1 }]));

    await expect(getBaralhos()).resolves.toHaveLength(1);
  });
});

describe("getBaralho", () => {
  const detail = {
    id: "b1",
    titulo: "Biologia",
    dataCriacao: "2026-01-02T03:04:05.000Z",
    origens: [],
    cards: [
      {
        id: "c1",
        pergunta: "p",
        resposta: "r",
        tipo: null,
        conceito: "Célula",
        conceitosConectados: [],
      },
    ],
  };

  it("aceita tipo nulo no card, como a API devolve", async () => {
    fetchMock.mockResolvedValue(httpResponse(detail));

    const baralho = await getBaralho("b1");

    expect(baralho.cards[0].tipo).toBeNull();
    expect(baralho.dataCriacao).toBeInstanceOf(Date);
  });

  it("recusa um card sem os campos do contrato", async () => {
    fetchMock.mockResolvedValue(httpResponse({ ...detail, cards: [{ id: "c1" }] }));

    await expect(getBaralho("b1")).rejects.toThrow(/fora do contrato/);
  });
});
