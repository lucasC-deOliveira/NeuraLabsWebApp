import { describe, it, expect } from "vitest";
import {
  dominioColor,
  prioridadeColor,
  formatDate,
  buildNotaLines,
  panelHeight,
  TIPO_NOTA_LABELS,
  SUBTIPO_LABELS,
} from "./vr-panel.helpers";

describe("dominioColor", () => {
  it("retorna verde para domínio >= 0.7", () => {
    expect(dominioColor(0.7)).toBe("#22c55e");
    expect(dominioColor(1.0)).toBe("#22c55e");
  });
  it("retorna amarelo para domínio entre 0.4 e 0.69", () => {
    expect(dominioColor(0.4)).toBe("#eab308");
    expect(dominioColor(0.69)).toBe("#eab308");
  });
  it("retorna vermelho para domínio entre 0 e 0.39", () => {
    expect(dominioColor(0.01)).toBe("#ef4444");
    expect(dominioColor(0.39)).toBe("#ef4444");
  });
  it("retorna cinza para domínio 0", () => {
    expect(dominioColor(0)).toBe("#71717a");
  });
});

describe("prioridadeColor", () => {
  it("retorna vermelho para prioridade >= 7", () => {
    expect(prioridadeColor(7)).toBe("#ef4444");
    expect(prioridadeColor(10)).toBe("#ef4444");
  });
  it("retorna amarelo para prioridade entre 4 e 6", () => {
    expect(prioridadeColor(4)).toBe("#eab308");
    expect(prioridadeColor(6)).toBe("#eab308");
  });
  it("retorna verde para prioridade < 4", () => {
    expect(prioridadeColor(0)).toBe("#22c55e");
    expect(prioridadeColor(3)).toBe("#22c55e");
  });
});

describe("formatDate", () => {
  it("retorna null para null/undefined/string vazia", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate("")).toBeNull();
  });
  it("formata uma data ISO válida", () => {
    const result = formatDate("2025-01-15T10:30:00.000Z");
    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();
    // Deve conter pelo menos o ano
    expect(result).toMatch(/2025/);
  });
});

describe("TIPO_NOTA_LABELS", () => {
  it("cobre os três tipos esperados", () => {
    expect(TIPO_NOTA_LABELS["LITERATURA"]).toBe("Ref. literatura");
    expect(TIPO_NOTA_LABELS["PERMANENTE"]).toBe("Permanente");
    expect(TIPO_NOTA_LABELS["ESTRUTURA"]).toBe("Estrutura");
  });
});

describe("SUBTIPO_LABELS", () => {
  it("cobre todos os subtipos conhecidos", () => {
    const expected = ["DEFINICAO", "EXPLICACAO", "EXEMPLO", "COMPARACAO", "SINTESE", "PREREQUISITO", "ERRO_COMUM", "APLICACAO"];
    for (const key of expected) {
      expect(SUBTIPO_LABELS[key], `falta subtipo ${key}`).toBeDefined();
    }
  });
});

describe("buildNotaLines", () => {
  it("retorna array vazio para null", () => {
    expect(buildNotaLines(null)).toEqual([]);
  });
  it("inclui tipoNota traduzido", () => {
    const lines = buildNotaLines({ tipoNota: "PERMANENTE", subtipo: null, fonte: null, slug: null, dataCriacao: null, dataAtualizacao: null });
    expect(lines).toContain("Permanente");
  });
  it("inclui subtipo traduzido", () => {
    const lines = buildNotaLines({ tipoNota: null, subtipo: "DEFINICAO", fonte: null, slug: null, dataCriacao: null, dataAtualizacao: null });
    expect(lines).toContain("Definição");
  });
  it("inclui fonte com prefixo", () => {
    const lines = buildNotaLines({ tipoNota: null, subtipo: null, fonte: "Livro X", slug: null, dataCriacao: null, dataAtualizacao: null });
    expect(lines).toContain("Fonte: Livro X");
  });
  it("não duplica data de modificação igual à criação", () => {
    const iso = "2025-06-01T12:00:00.000Z";
    const lines = buildNotaLines({ tipoNota: null, subtipo: null, fonte: null, slug: null, dataCriacao: iso, dataAtualizacao: iso });
    const criada = lines.filter((l) => l.startsWith("Criada:"));
    const modif  = lines.filter((l) => l.startsWith("Modif.:"));
    expect(criada).toHaveLength(1);
    expect(modif).toHaveLength(0);
  });
  it("usa tipo desconhecido como fallback", () => {
    const lines = buildNotaLines({ tipoNota: "NOVO_TIPO", subtipo: null, fonte: null, slug: null, dataCriacao: null, dataAtualizacao: null });
    expect(lines).toContain("NOVO_TIPO");
  });
});

describe("panelHeight", () => {
  it("altura mínima sem nenhum conteúdo extra", () => {
    const h = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 0, numRels: 0 });
    expect(h).toBeCloseTo(0.34);
  });
  it("cresce com pergunta", () => {
    const base = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 0, numRels: 0 });
    const com  = panelHeight({ hasPergunta: true,  hasDeckStats: false, notaLinesCount: 0, numRels: 0 });
    expect(com - base).toBeCloseTo(0.036);
  });
  it("cresce com deckStats", () => {
    const base = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 0, numRels: 0 });
    const com  = panelHeight({ hasPergunta: false, hasDeckStats: true,  notaLinesCount: 0, numRels: 0 });
    expect(com - base).toBeCloseTo(0.052);
  });
  it("cresce com relações (cap em 7)", () => {
    const h7  = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 0, numRels: 7 });
    const h20 = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 0, numRels: 20 });
    expect(h7).toBeCloseTo(h20);
    expect(h7).toBeCloseTo(0.34 + 7 * 0.042);
  });
  it("cresce com linhas de nota", () => {
    const h1 = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 1, numRels: 0 });
    const h3 = panelHeight({ hasPergunta: false, hasDeckStats: false, notaLinesCount: 3, numRels: 0 });
    expect(h3 - h1).toBeCloseTo(2 * 0.022);
  });
});
