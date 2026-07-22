import { describe, it, expect } from "vitest";
import { segmentByLang, isEnglishTerm, baseLang } from "./lang-segments";

describe("baseLang (PT-biased)", () => {
  it("defaults Portuguese-looking text to pt-BR (the bug: 'como funciona')", () => {
    expect(baseLang("heap como funciona")).toBe("pt-BR");
    expect(baseLang("como funciona a pilha")).toBe("pt-BR");
  });

  it("uses en-US only with a real English signal", () => {
    expect(baseLang("what is a stack")).toBe("en-US"); // stopword "what"/"is"
    expect(baseLang("binary search tree")).toBe("en-US"); // toda palavra é termo
  });

  it("detects Japanese", () => {
    expect(baseLang("これは何ですか")).toBe("ja-JP");
  });
});

describe("isEnglishTerm", () => {
  it("recognizes tech terms case-insensitively", () => {
    expect(isEnglishTerm("heap")).toBe(true);
    expect(isEnglishTerm("HEAP")).toBe(true);
    expect(isEnglishTerm("Cache")).toBe(true);
  });

  it("does not flag ordinary Portuguese words", () => {
    expect(isEnglishTerm("como")).toBe(false);
    expect(isEnglishTerm("funciona")).toBe(false);
    expect(isEnglishTerm("o")).toBe(false);
  });
});

describe("segmentByLang", () => {
  it("speaks a tech term in English and the rest in Portuguese", () => {
    expect(segmentByLang("heap como funciona", "pt-BR")).toEqual([
      { text: "heap ", lang: "en-US" },
      { text: "como funciona", lang: "pt-BR" },
    ]);
  });

  it("handles a term in the middle of the sentence", () => {
    expect(segmentByLang("a estrutura stack é uma pilha", "pt-BR")).toEqual([
      { text: "a estrutura ", lang: "pt-BR" },
      { text: "stack ", lang: "en-US" },
      { text: "é uma pilha", lang: "pt-BR" },
    ]);
  });

  it("keeps a single segment when there is no tech term", () => {
    expect(segmentByLang("como funciona a pilha", "pt-BR")).toEqual([
      { text: "como funciona a pilha", lang: "pt-BR" },
    ]);
  });

  it("reconstructs the original text by concatenating segments", () => {
    const text = "o cache do backend guarda dados";
    expect(segmentByLang(text, "pt-BR").map((s) => s.text).join("")).toBe(text);
  });
});
