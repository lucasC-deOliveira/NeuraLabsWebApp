import { describe, it, expect } from "vitest";
import {
  slugify,
  paraFolder,
  vaultNodeLabel,
  nodeRelPath,
  serializeNode,
  parseNode,
  PARA_FOLDERS,
  type VaultNode,
} from "./vault-format";

// ── fixtures ──────────────────────────────────────────────────────────────────

const BASE: VaultNode = {
  id: "abc-123",
  tipo: "CONCEITO",
  grafoId: "grafo-1",
  nome: "QuickSort",
  descricao: "Algoritmo de ordenação",
  relacoes: [],
};

function make(overrides: Partial<VaultNode>): VaultNode {
  return { ...BASE, relacoes: [], ...overrides };
}

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("converte para minúsculo e troca espaços por hífen", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("remove acentos portugueses", () => {
    expect(slugify("Árvore Binária")).toBe("arvore-binaria");
    expect(slugify("Exceção à Regra")).toBe("excecao-a-regra");
    expect(slugify("Programação Orientada")).toBe("programacao-orientada");
  });

  it("remove caracteres especiais, mantém hífens internos", () => {
    expect(slugify("foo & bar!")).toBe("foo-bar");
    expect(slugify("c++ language")).toBe("c-language");
  });

  it("trunca em 60 caracteres", () => {
    const long = "a".repeat(80);
    expect(slugify(long)).toHaveLength(60);
  });

  it("remove hífens duplos nas bordas", () => {
    expect(slugify("  leading and trailing  ")).toBe("leading-and-trailing");
    expect(slugify("---foo---")).toBe("foo");
  });

  it("string vazia retorna 'no'", () => {
    expect(slugify("")).toBe("no");
    expect(slugify("!@#$")).toBe("no");
  });
});

// ── paraFolder ────────────────────────────────────────────────────────────────

describe("paraFolder", () => {
  it("BARALHO → Projects", () => expect(paraFolder("BARALHO")).toBe("Projects"));
  it("ASSUNTO → Areas", () => expect(paraFolder("ASSUNTO")).toBe("Areas"));

  it.each(["TOPICO", "CONCEITO", "NOTA", "FLASHCARD", "TEXTO_BRUTO"] as const)(
    "%s → Resources",
    (tipo) => expect(paraFolder(tipo)).toBe("Resources"),
  );

  it("todos os tipos estão cobertos pelo PARA", () => {
    const tipos = ["BARALHO", "ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD", "TEXTO_BRUTO"] as const;
    for (const tipo of tipos) {
      expect(PARA_FOLDERS).toContain(paraFolder(tipo));
    }
  });
});

// ── vaultNodeLabel ────────────────────────────────────────────────────────────

describe("vaultNodeLabel", () => {
  it("ASSUNTO/TOPICO/CONCEITO usa nome", () => {
    expect(vaultNodeLabel(make({ tipo: "ASSUNTO", nome: "Algoritmos" }))).toBe("Algoritmos");
    expect(vaultNodeLabel(make({ tipo: "TOPICO", nome: "Ordenação" }))).toBe("Ordenação");
    expect(vaultNodeLabel(make({ tipo: "CONCEITO", nome: "QuickSort" }))).toBe("QuickSort");
  });

  it("ASSUNTO/TOPICO/CONCEITO cai no id quando nome é undefined", () => {
    expect(vaultNodeLabel(make({ tipo: "CONCEITO", nome: undefined }))).toBe(BASE.id);
  });

  it("FLASHCARD usa pergunta truncada a 60 chars", () => {
    const pergunta = "Qual é a complexidade do QuickSort no pior caso?";
    expect(vaultNodeLabel(make({ tipo: "FLASHCARD", pergunta }))).toBe(pergunta);
  });

  it("FLASHCARD trunca pergunta longa em 60 chars com '…'", () => {
    const pergunta = "a".repeat(80);
    const label = vaultNodeLabel(make({ tipo: "FLASHCARD", pergunta }));
    expect(label).toHaveLength(61);
    expect(label.endsWith("…")).toBe(true);
  });

  it("FLASHCARD sem pergunta cai no id", () => {
    expect(vaultNodeLabel(make({ tipo: "FLASHCARD", pergunta: undefined }))).toBe(BASE.id);
  });

  it("NOTA usa titulo quando disponível e diferente de 'Sem título'", () => {
    const n = make({ tipo: "NOTA", titulo: "Minha nota", conteudo: "..." });
    expect(vaultNodeLabel(n)).toBe("Minha nota");
  });

  it("NOTA com titulo 'Sem título' cai no conteúdo truncado", () => {
    const n = make({ tipo: "NOTA", titulo: "Sem título", conteudo: "Conteúdo da nota" });
    expect(vaultNodeLabel(n)).toBe("Conteúdo da nota");
  });

  it("BARALHO usa titulo ou nome", () => {
    expect(vaultNodeLabel(make({ tipo: "BARALHO", titulo: "Deck Algoritmos" }))).toBe("Deck Algoritmos");
    expect(vaultNodeLabel(make({ tipo: "BARALHO", titulo: undefined, nome: "Algoritmos" }))).toBe("Algoritmos");
  });

  it("TEXTO_BRUTO com titulo válido usa o titulo", () => {
    const n = make({ tipo: "TEXTO_BRUTO", titulo: "Texto importado", texto: "conteúdo..." });
    expect(vaultNodeLabel(n)).toBe("Texto importado");
  });

  it("TEXTO_BRUTO com titulo 'Texto sem título' cai no texto truncado", () => {
    const n = make({ tipo: "TEXTO_BRUTO", titulo: "Texto sem título", texto: "corpo do texto" });
    expect(vaultNodeLabel(n)).toBe("corpo do texto");
  });

  it("TEXTO_BRUTO sem titulo cai no texto", () => {
    const n = make({ tipo: "TEXTO_BRUTO", titulo: undefined, texto: "corpo" });
    expect(vaultNodeLabel(n)).toBe("corpo");
  });

  it("TEXTO_BRUTO sem titulo e sem texto cai no id", () => {
    const n = make({ tipo: "TEXTO_BRUTO", titulo: undefined, texto: undefined });
    expect(vaultNodeLabel(n)).toBe(n.id);
  });

  it("NOTA sem titulo e sem conteúdo cai no id", () => {
    const n = make({ tipo: "NOTA", titulo: undefined, conteudo: undefined });
    expect(vaultNodeLabel(n)).toBe(n.id);
  });
});

// ── nodeRelPath ───────────────────────────────────────────────────────────────

describe("nodeRelPath", () => {
  it("formato esperado: pasta/slug--id.md", () => {
    const n = make({ tipo: "CONCEITO", nome: "QuickSort", id: "abc-123" });
    expect(nodeRelPath(n)).toBe("Resources/quicksort--abc-123.md");
  });

  it("ASSUNTO vai para Areas/", () => {
    const n = make({ tipo: "ASSUNTO", nome: "Algoritmos", id: "x1" });
    expect(nodeRelPath(n)).toMatch(/^Areas\//);
  });

  it("BARALHO vai para Projects/", () => {
    const n = make({ tipo: "BARALHO", titulo: "Deck", id: "d1" });
    expect(nodeRelPath(n)).toMatch(/^Projects\//);
  });

  it("nome com acentos é slugificado", () => {
    const n = make({ tipo: "CONCEITO", nome: "Árvore Binária", id: "z9" });
    expect(nodeRelPath(n)).toBe("Resources/arvore-binaria--z9.md");
  });
});

// ── serializeNode / parseNode (round-trip) ────────────────────────────────────

describe("serializeNode → parseNode round-trip", () => {
  it("CONCEITO com relações preserva todos os campos", () => {
    const n = make({
      tipo: "CONCEITO",
      nome: "QuickSort",
      descricao: "Divide e conquista",
      nivelDominio: 3,
      posicaoX: 10,
      posicaoY: -20,
      relacoes: [{ rel: "PERTENCE_A", alvo: "topico-999", peso: 1 }],
    });
    const parsed = parseNode(serializeNode(n));
    expect(parsed).not.toBeNull();
    expect(parsed!.id).toBe(n.id);
    expect(parsed!.tipo).toBe(n.tipo);
    expect(parsed!.nome).toBe(n.nome);
    expect(parsed!.descricao).toBe(n.descricao);
    expect(parsed!.nivelDominio).toBe(3);
    expect(parsed!.posicaoX).toBe(10);
    expect(parsed!.posicaoY).toBe(-20);
    expect(parsed!.relacoes).toHaveLength(1);
    expect(parsed!.relacoes[0].rel).toBe("PERTENCE_A");
    expect(parsed!.relacoes[0].alvo).toBe("topico-999");
    expect(parsed!.relacoes[0].peso).toBe(1);
  });

  it("FLASHCARD preserva pergunta e resposta separadas", () => {
    const n = make({
      tipo: "FLASHCARD",
      pergunta: "O que é Big-O?",
      resposta: "Notação de complexidade assintótica.",
    });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.pergunta).toBe("O que é Big-O?");
    expect(parsed!.resposta).toBe("Notação de complexidade assintótica.");
  });

  it("FLASHCARD com Markdown na resposta sobrevive ao round-trip", () => {
    const n = make({
      tipo: "FLASHCARD",
      pergunta: "Diferença entre `==` e `===`?",
      resposta: "- `==` coerce tipos\n- `===` compara sem coerção",
    });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.resposta).toContain("===");
    expect(parsed!.resposta).toContain("==");
  });

  it("NOTA preserva conteúdo Markdown multi-linha", () => {
    const conteudo = "# Título\n\nParágrafo com **negrito** e `código`.\n\n- item 1\n- item 2";
    const n = make({ tipo: "NOTA", titulo: "Minha nota", conteudo });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.conteudo).toBe(conteudo);
  });

  it("ASSUNTO sem relações serializa e parseia sem erros", () => {
    const n = make({ tipo: "ASSUNTO", nome: "Computação", descricao: null, relacoes: [] });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.nome).toBe("Computação");
    expect(parsed!.relacoes).toHaveLength(0);
  });

  it("múltiplas relações preservam todas", () => {
    const n = make({
      relacoes: [
        { rel: "PERTENCE_A", alvo: "t1", peso: 1 },
        { rel: "PREREQUISITO", alvo: "c2", peso: 2 },
      ],
    });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.relacoes).toHaveLength(2);
    expect(parsed!.relacoes.map((r) => r.rel)).toEqual(["PERTENCE_A", "PREREQUISITO"]);
  });
});

// ── parseNode: edge cases ─────────────────────────────────────────────────────

describe("parseNode: entradas inválidas", () => {
  it("retorna null sem frontmatter", () => {
    expect(parseNode("# apenas markdown")).toBeNull();
  });

  it("retorna null sem campo id", () => {
    const raw = `---\ntipo: CONCEITO\ngrafo: g1\ntitulo: Foo\n---\n`;
    expect(parseNode(raw)).toBeNull();
  });

  it("retorna null sem campo tipo", () => {
    const raw = `---\nid: abc\ngrafo: g1\ntitulo: Foo\n---\n`;
    expect(parseNode(raw)).toBeNull();
  });

  it("relações com alvo sem wikilink são tratadas como string simples", () => {
    const raw = `---\nid: abc\ntipo: CONCEITO\ngrafo: g1\ntitulo: Foo\nrelacoes:\n  - rel: IS_A\n    alvo: sem-wikilink\n    peso: 1\n---\n`;
    const parsed = parseNode(raw);
    expect(parsed!.relacoes[0].alvo).toBe("sem-wikilink");
  });

  it("relações com alvo em wikilink [[id]] extraem o id", () => {
    const raw = `---\nid: abc\ntipo: CONCEITO\ngrafo: g1\ntitulo: Foo\nrelacoes:\n  - rel: IS_A\n    alvo: "[[topico-xyz]]"\n    peso: 1\n---\n`;
    const parsed = parseNode(raw);
    expect(parsed!.relacoes[0].alvo).toBe("topico-xyz");
  });

  it("string vazia retorna null", () => {
    expect(parseNode("")).toBeNull();
  });

  it("preserva fonte quando definida", () => {
    const n = make({ tipo: "CONCEITO", fonte: "https://example.com" });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.fonte).toBe("https://example.com");
  });

  it("fonte é null quando ausente", () => {
    const n = make({ tipo: "CONCEITO", fonte: null });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.fonte).toBeNull();
  });

  it("preserva tipoNota e subtipo quando definidos", () => {
    const n = make({ tipo: "NOTA", titulo: "N", conteudo: "c", tipoNota: "PERMANENTE", subtipo: "CONCEITUAL" });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.tipoNota).toBe("PERMANENTE");
    expect(parsed!.subtipo).toBe("CONCEITUAL");
  });

  it("tipoNota e subtipo são undefined quando ausentes", () => {
    const n = make({ tipo: "NOTA", titulo: "N", conteudo: "c", tipoNota: undefined, subtipo: undefined });
    const parsed = parseNode(serializeNode(n));
    expect(parsed!.tipoNota).toBeUndefined();
    expect(parsed!.subtipo).toBeUndefined();
  });
});

// ── WIKILINK regex ────────────────────────────────────────────────────────────

describe("parseNode: extração de wikilink em relações", () => {
  function parseRel(alvo: string) {
    const raw = `---\nid: n1\ntipo: CONCEITO\ngrafo: g1\ntitulo: T\nrelacoes:\n  - rel: IS_A\n    alvo: "${alvo}"\n    peso: 1\n---\n`;
    return parseNode(raw)?.relacoes[0]?.alvo;
  }

  it("[[id-simples]] extrai o id", () => {
    expect(parseRel("[[abc-123]]")).toBe("abc-123");
  });

  it("[[id com espaços]] extrai e trim", () => {
    expect(parseRel("[[ abc-123 ]]")).toBe("abc-123");
  });

  it("[[uuid completo]] extrai corretamente", () => {
    expect(parseRel("[[550e8400-e29b-41d4-a716-446655440000]]")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("sem wikilink retorna a string como está", () => {
    expect(parseRel("id-sem-colchetes")).toBe("id-sem-colchetes");
  });

  it("[colchete-simples] não é wikilink", () => {
    expect(parseRel("[apenas-um]")).toBe("[apenas-um]");
  });
});

// ── PARA_FOLDERS completude ───────────────────────────────────────────────────

describe("PARA_FOLDERS", () => {
  it("contém exatamente Projects, Areas, Resources, Archives", () => {
    expect(PARA_FOLDERS).toEqual(["Projects", "Areas", "Resources", "Archives"]);
  });

  it("não contém duplicatas", () => {
    expect(new Set(PARA_FOLDERS).size).toBe(PARA_FOLDERS.length);
  });
});

// ── QUESTION e PROVA ──────────────────────────────────────────────────────────

const QUESTAO: VaultNode = {
  id: "q-1",
  tipo: "QUESTION",
  grafoId: "grafo-1",
  enunciado: "Segundo o ITIL 4, o que é um SLA?",
  alternativas: [
    { letra: "A", texto: "Acordo entre provedor e cliente" },
    { letra: "B", texto: "Acordo entre times internos" },
  ],
  gabarito: "A",
  explicacao: "OLA é o acordo interno; SLA é com o cliente.",
  tipoQuestao: "MULTIPLA_ESCOLHA",
  relacoes: [],
};

describe("paraFolder: questões e provas", () => {
  it("QUESTION vai para Resources e PROVA para Projects", () => {
    expect(paraFolder("QUESTION")).toBe("Resources");
    expect(paraFolder("PROVA")).toBe("Projects");
  });
});

describe("vaultNodeLabel: QUESTION", () => {
  it("usa o enunciado, truncado em 60 caracteres", () => {
    expect(vaultNodeLabel(QUESTAO)).toBe("Segundo o ITIL 4, o que é um SLA?");
    const longa = make({ ...QUESTAO, enunciado: "a".repeat(80) });
    expect(vaultNodeLabel(longa)).toBe(`${"a".repeat(60)}…`);
  });

  it("cai no id quando não há enunciado", () => {
    expect(vaultNodeLabel(make({ ...QUESTAO, enunciado: undefined }))).toBe("q-1");
  });
});

describe("serializeNode/parseNode: QUESTION", () => {
  it("ida e volta preserva enunciado, alternativas, gabarito e explicação", () => {
    const parsed = parseNode(serializeNode(QUESTAO));
    expect(parsed!.tipo).toBe("QUESTION");
    expect(parsed!.enunciado).toBe(QUESTAO.enunciado);
    expect(parsed!.alternativas).toEqual(QUESTAO.alternativas);
    expect(parsed!.gabarito).toBe("A");
    expect(parsed!.explicacao).toBe(QUESTAO.explicacao);
    expect(parsed!.tipoQuestao).toBe("MULTIPLA_ESCOLHA");
  });

  it("omite as seções vazias em vez de escrever cabeçalho solto", () => {
    const vf = make({ ...QUESTAO, alternativas: [], explicacao: null });
    const md = serializeNode(vf);
    expect(md).not.toContain("## Alternativas");
    expect(md).not.toContain("## Explicação");
    expect(md).toContain("## Gabarito");
  });

  it("o arquivo cai em Resources com o slug do enunciado", () => {
    expect(nodeRelPath(QUESTAO)).toBe("Resources/segundo-o-itil-4-o-que-e-um-sla--q-1.md");
  });

  it("aceita `## Explicacao` sem acento (arquivo editado à mão)", () => {
    const raw = `---\nid: q9\ntipo: QUESTION\ngrafo: g1\ntitulo: T\n---\n\n## Enunciado\n\nE\n\n## Gabarito\n\nB\n\n## Explicacao\n\nPorque sim\n`;
    expect(parseNode(raw)!.explicacao).toBe("Porque sim");
  });

  it("sem `## Enunciado`, o corpo inteiro vira o enunciado em vez de sumir", () => {
    const raw = `---\nid: q9\ntipo: QUESTION\ngrafo: g1\ntitulo: T\n---\n\nTexto solto da questão\n`;
    const parsed = parseNode(raw)!;
    expect(parsed.enunciado).toBe("Texto solto da questão");
    expect(parsed.gabarito).toBe("");
  });

  it("ignora linhas de alternativa fora do formato `- (X) texto`", () => {
    const raw = `---\nid: q9\ntipo: QUESTION\ngrafo: g1\ntitulo: T\n---\n\n## Alternativas\n\n- (A) vale\nlixo solto\n* (B) asterisco também vale\n`;
    expect(parseNode(raw)!.alternativas).toEqual([
      { letra: "A", texto: "vale" },
      { letra: "B", texto: "asterisco também vale" },
    ]);
  });
});

describe("serializeNode/parseNode: PROVA", () => {
  it("ida e volta preserva título e descrição", () => {
    const prova = make({ id: "p-1", tipo: "PROVA", titulo: "TRT-24 2017", descricao: "Prova FCC" });
    const parsed = parseNode(serializeNode(prova));
    expect(parsed!.titulo).toBe("TRT-24 2017");
    expect(parsed!.descricao).toBe("Prova FCC");
    expect(nodeRelPath(prova)).toBe("Projects/trt-24-2017--p-1.md");
  });
});

// ── pesoEdital ────────────────────────────────────────────────────────────────

describe("serializeNode/parseNode: pesoEdital", () => {
  it("ida e volta preserva o peso declarado", () => {
    const n = make({ pesoEdital: 1.6 });
    expect(parseNode(serializeNode(n))!.pesoEdital).toBe(1.6);
  });

  // Escrever 1 em todo arquivo seria ruído: ausente já significa neutro.
  it("não escreve a chave quando não há peso", () => {
    const md = serializeNode(make({ pesoEdital: null }));
    expect(md).not.toContain("pesoEdital");
    expect(parseNode(md)!.pesoEdital).toBeNull();
  });

  it("um pesoEdital não numérico vira null em vez de sujar o payload", () => {
    const raw = `---\nid: n1\ntipo: CONCEITO\ngrafo: g1\ntitulo: T\npesoEdital: "muito"\n---\n\nx\n`;
    expect(parseNode(raw)!.pesoEdital).toBeNull();
  });
});
