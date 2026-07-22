import { describe, it, expect } from "vitest";
import { stripMarkdown, guessSpeechLang } from "./speech-text";

describe("stripMarkdown", () => {
  it("drops emphasis, headings and inline code marks", () => {
    expect(stripMarkdown("# Título **forte** com `código`")).toBe("Título forte com código");
  });

  it("keeps the link text and drops the url", () => {
    expect(stripMarkdown("veja [a doc](https://x.com/y)")).toBe("veja a doc");
  });

  it("removes fenced code blocks entirely", () => {
    expect(stripMarkdown("antes\n```js\nconst x = 1;\n```\ndepois")).toBe("antes depois");
  });
});

describe("guessSpeechLang", () => {
  it("detects Japanese by kana/kanji", () => {
    expect(guessSpeechLang("これは何ですか")).toBe("ja-JP");
  });

  it("uses Portuguese when there are pt diacritics", () => {
    expect(guessSpeechLang("O que é uma função recursiva?")).toBe("pt-BR");
  });

  it("uses English for an accent-free English sentence", () => {
    expect(guessSpeechLang("What is the call stack?")).toBe("en-US");
  });

  // O caso do acervo: termo técnico curto em inglês, sem acento nem stopword.
  it("treats a short ascii tech term as English", () => {
    expect(guessSpeechLang("Binary Search")).toBe("en-US");
  });

  // Português sem acento não deve virar inglês por engano.
  it("keeps accent-free Portuguese as Portuguese when it has pt function words", () => {
    expect(guessSpeechLang("pilha de chamadas")).toBe("pt-BR");
  });

  it("defaults to Portuguese when unsure", () => {
    expect(guessSpeechLang("123 456")).toBe("pt-BR");
  });
});
