import { describe, it, expect } from "vitest";
import {
  CREATE_NODE_SCHEMAS, EMPTY_CREATE_NODE_FORM, schemaForNodeType, validateCreateNodeForm,
} from "./create-node-schema";
import type { CreateNodeFormValues } from "./create-node-form";

function form(over: Partial<CreateNodeFormValues>): CreateNodeFormValues {
  return { ...EMPTY_CREATE_NODE_FORM, ...over };
}

/** Field path -> message, for the paths that failed validation. */
function failures(type: string, over: Partial<CreateNodeFormValues>): Record<string, string> {
  const result = schemaForNodeType(type).safeParse(form(over));
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("schemaForNodeType", () => {
  it("names the node type in the missing-name message", () => {
    expect(failures("ASSUNTO", {}).nome).toBe("Digite um nome para o assunto");
    expect(failures("TOPICO", {}).nome).toBe("Digite um nome para o tópico");
    expect(failures("CONCEITO", {}).nome).toBe("Digite um nome para o conceito");
    expect(failures("NOTA", {}).nome).toBe("Digite um título para a nota");
    expect(failures("BARALHO", {}).nome).toBe("Digite um título para o baralho");
  });

  it("falls back to a generic name rule for a type with no schema of its own", () => {
    expect(failures("EDITAL", {}).nome).toBe("Digite um nome");
    expect(failures("EDITAL", { nome: "Edital 2026" })).toEqual({});
  });

  it("accepts a named ASSUNTO and ignores the fields of other types", () => {
    expect(failures("ASSUNTO", { nome: "Direito Constitucional" })).toEqual({});
  });

  it("treats a whitespace-only name as missing", () => {
    expect(failures("CONCEITO", { nome: "   " }).nome).toBe("Digite um nome para o conceito");
  });

  it("keeps descricao optional", () => {
    expect(failures("TOPICO", { nome: "Princípios", descricao: "" })).toEqual({});
  });
});

describe("CREATE_NODE_SCHEMAS.FLASHCARD", () => {
  it("requires both sides of the card", () => {
    expect(failures("FLASHCARD", {})).toEqual({
      pergunta: "Digite a pergunta do flashcard",
      resposta: "Digite a resposta para o flashcard",
    });
  });

  it("does not require a name", () => {
    expect(failures("FLASHCARD", { pergunta: "p", resposta: "r" })).toEqual({});
  });
});

describe("CREATE_NODE_SCHEMAS.NOTA", () => {
  it("requires title, subtype and content", () => {
    expect(failures("NOTA", {})).toEqual({
      nome: "Digite um título para a nota",
      subtipo: "Selecione o subtipo da nota",
      conteudo: "Digite o texto da nota",
    });
  });

  it("accepts a complete PERMANENTE note without a source", () => {
    expect(failures("NOTA", {
      nome: "SVM maximiza a margem", subtipo: "DEFINICAO", conteudo: "texto", tipoNota: "PERMANENTE",
    })).toEqual({});
  });

  it("demands the source only for LITERATURA notes", () => {
    const literatura = { nome: "t", subtipo: "DEFINICAO", conteudo: "c", tipoNota: "LITERATURA" };
    expect(failures("NOTA", literatura).fonte).toBe("Notas de referência exigem a fonte (livro, artigo, vídeo...)");
    expect(failures("NOTA", { ...literatura, fonte: "Livro X" })).toEqual({});
    expect(failures("NOTA", { ...literatura, tipoNota: "PERMANENTE" })).toEqual({});
  });

  it("reports every missing field at once, not just the first", () => {
    // O validador antigo devolvia só o primeiro código violado (um toast por vez).
    expect(Object.keys(failures("NOTA", { tipoNota: "LITERATURA" })).sort())
      .toEqual(["conteudo", "fonte", "nome", "subtipo"]);
  });
});

describe("EMPTY_CREATE_NODE_FORM", () => {
  it("starts as a PERMANENTE note, matching the previous default", () => {
    expect(EMPTY_CREATE_NODE_FORM.tipoNota).toBe("PERMANENTE");
  });

  it("covers every key of CreateNodeFormValues", () => {
    expect(Object.keys(EMPTY_CREATE_NODE_FORM).sort())
      .toEqual(["conteudo", "descricao", "fonte", "nome", "pergunta", "resposta", "subtipo", "tipoNota"]);
  });
});

describe("CREATE_NODE_SCHEMAS", () => {
  it("exposes a schema per handled node type", () => {
    expect(Object.keys(CREATE_NODE_SCHEMAS).sort())
      .toEqual(["ASSUNTO", "BARALHO", "CONCEITO", "FLASHCARD", "NOTA", "TOPICO"]);
  });
});

// A guarda do use-case (CreateNodeValidationError) sai do mesmo schema. Estes casos
// vieram do create-node-form.spec e travam os códigos que o use-case lança.
describe("validateCreateNodeForm", () => {
  it("requires nome for ASSUNTO/TOPICO/CONCEITO", () => {
    expect(validateCreateNodeForm("ASSUNTO", form({}))).toBe("missing-name");
    expect(validateCreateNodeForm("TOPICO", form({ nome: "x" }))).toBeNull();
  });

  it("distinguishes missing question vs answer for FLASHCARD", () => {
    expect(validateCreateNodeForm("FLASHCARD", form({}))).toBe("flashcard-missing-question");
    expect(validateCreateNodeForm("FLASHCARD", form({ pergunta: "q" }))).toBe("flashcard-missing-answer");
    expect(validateCreateNodeForm("FLASHCARD", form({ pergunta: "q", resposta: "a" }))).toBeNull();
  });

  it("validates NOTA fields in order (title, subtype, source, content)", () => {
    expect(validateCreateNodeForm("NOTA", form({}))).toBe("missing-name");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t" }))).toBe("nota-missing-subtype");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO", tipoNota: "LITERATURA" })))
      .toBe("nota-missing-source");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO" }))).toBe("nota-missing-content");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO", conteudo: "c" }))).toBeNull();
  });

  it("agrees with the schema on whether the form is valid at all", () => {
    const cases: Array<[string, Partial<CreateNodeFormValues>]> = [
      ["ASSUNTO", {}], ["ASSUNTO", { nome: "a" }],
      ["FLASHCARD", { pergunta: "q" }], ["FLASHCARD", { pergunta: "q", resposta: "a" }],
      ["NOTA", { nome: "t", subtipo: "DEFINICAO", tipoNota: "LITERATURA", fonte: "f", conteudo: "c" }],
      ["BARALHO", {}], ["EDITAL", { nome: "e" }],
    ];
    for (const [type, over] of cases) {
      const rejectedBySchema = !schemaForNodeType(type).safeParse(form(over)).success;
      expect(validateCreateNodeForm(type, form(over)) !== null, `${type} ${JSON.stringify(over)}`)
        .toBe(rejectedBySchema);
    }
  });
});
