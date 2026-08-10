import { describe, it, expect } from "vitest";
import { validateVault, countErrors } from "./vault-validate";
import type { VaultFile } from "./vault-bridge";

function md(relPath: string, front: string, body = ""): VaultFile {
  return { relPath, content: `---\n${front}\n---\n\n${body}` };
}

const conceito = (id: string, nome = "SLA") =>
  md(`Resources/${nome}--${id}.md`, `id: "${id}"\ntipo: CONCEITO\ngrafo: "g1"\ntitulo: "${nome}"`, nome);

const flashcard = (id: string, alvo: string) =>
  md(
    `Resources/card--${id}.md`,
    `id: "${id}"\ntipo: FLASHCARD\ngrafo: "g1"\ntitulo: "P"\nrelacoes:\n  - rel: HERDA\n    alvo: "[[${alvo}]]"\n    peso: 1`,
    "## Pergunta\n\nP\n\n## Resposta\n\nR\n",
  );

describe("validateVault", () => {
  it("aprova um vault bem formado", () => {
    const issues = validateVault([conceito("c1"), flashcard("f1", "c1")]);
    expect(issues).toEqual([]);
  });

  it("acusa frontmatter ilegível como erro", () => {
    const issues = validateVault([{ relPath: "Resources/x.md", content: "sem frontmatter" }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("erro");
    expect(issues[0].message).toMatch(/Frontmatter/);
  });

  it("acusa id repetido em ambos os arquivos", () => {
    const issues = validateVault([conceito("dup", "A"), conceito("dup", "B"), flashcard("f1", "dup")]);
    const dups = issues.filter((i) => i.message.includes("repetido"));
    expect(dups).toHaveLength(2);
    expect(dups.every((i) => i.severity === "erro")).toBe(true);
  });

  it("acusa FLASHCARD sem pergunta ou resposta", () => {
    const vazio = md(
      "Resources/card--f9.md",
      `id: "f9"\ntipo: FLASHCARD\ngrafo: "g1"\ntitulo: "P"`,
      "só um texto solto",
    );
    const issues = validateVault([vazio]);
    expect(issues.some((i) => i.severity === "erro" && /FLASHCARD/.test(i.message))).toBe(true);
  });

  it("acusa QUESTION sem enunciado ou gabarito", () => {
    const semGabarito = md(
      "Resources/q--q9.md",
      `id: "q9"\ntipo: QUESTION\ngrafo: "g1"\ntitulo: "Q"`,
      "## Enunciado\n\nE\n",
    );
    const issues = validateVault([semGabarito]);
    expect(issues.some((i) => i.severity === "erro" && /QUESTION/.test(i.message))).toBe(true);
  });

  it("avisa quando a relação aponta para um id que não existe", () => {
    const issues = validateVault([flashcard("f1", "nao-existe")]);
    expect(issues.some((i) => i.severity === "aviso" && /não existe no vault/.test(i.message))).toBe(true);
  });

  // O Push descarta a aresta caladamente — sem o aviso, ninguém percebe.
  it("avisa quando o par de tipos não aceita a relação", () => {
    const cardParaCard = md(
      "Resources/card--f2.md",
      `id: "f2"\ntipo: FLASHCARD\ngrafo: "g1"\ntitulo: "P"\nrelacoes:\n  - rel: HERDA\n    alvo: "[[f1]]"\n    peso: 1`,
      "## Pergunta\n\nP\n\n## Resposta\n\nR\n",
    );
    const issues = validateVault([flashcard("f1", "f2"), cardParaCard]);
    expect(issues.some((i) => /não aceita HERDA/.test(i.message))).toBe(true);
  });

  it("avisa sobre peso fora da faixa, que o Push coage para 1", () => {
    const pesado = md(
      "Resources/card--f3.md",
      `id: "f3"\ntipo: FLASHCARD\ngrafo: "g1"\ntitulo: "P"\nrelacoes:\n  - rel: HERDA\n    alvo: "[[c1]]"\n    peso: 9`,
      "## Pergunta\n\nP\n\n## Resposta\n\nR\n",
    );
    const issues = validateVault([conceito("c1"), pesado]);
    expect(issues.some((i) => /coage para 1/.test(i.message))).toBe(true);
  });

  it("avisa sobre conceito que nenhum cartão ou questão testa", () => {
    const issues = validateVault([conceito("sozinho")]);
    expect(issues.some((i) => /sem nenhum flashcard/.test(i.message))).toBe(true);
  });

  it("avisa quando o arquivo está na pasta errada para o tipo", () => {
    const foraDeLugar = md("Projects/sla--c1.md", `id: "c1"\ntipo: CONCEITO\ngrafo: "g1"\ntitulo: "SLA"`, "x");
    const issues = validateVault([foraDeLugar, flashcard("f1", "c1")]);
    expect(issues.some((i) => /deveria estar em Resources/.test(i.message))).toBe(true);
  });

  it("põe os erros antes dos avisos", () => {
    const issues = validateVault([
      conceito("sozinho"),
      { relPath: "Resources/x.md", content: "quebrado" },
    ]);
    expect(issues[0].severity).toBe("erro");
  });
});

describe("countErrors", () => {
  it("conta só os erros", () => {
    const issues = validateVault([
      conceito("sozinho"),
      { relPath: "Resources/x.md", content: "quebrado" },
    ]);
    expect(countErrors(issues)).toBe(1);
    expect(issues.length).toBeGreaterThan(1);
  });
});
