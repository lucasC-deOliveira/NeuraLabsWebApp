import { describe, expect, it } from "vitest";
import { splitFlashcardBibliography } from "./flashcard-bibliography";

describe("flashcard bibliography", () => {
  it("separates the source blockquote used in existing ABGF cards", () => {
    const bibliography = "> **Fonte:** IETF **RFC 2131**\n> Seção 4.1.";
    expect(splitFlashcardBibliography("Texto.\r\n\r\n" + bibliography)).toEqual({ body: "Texto.", bibliography });
  });

  it("ends a bibliography section at the next heading at the same level", () => {
    const body = "Resposta.\n\n## Exemplo\nTexto.";
    const bibliography = "## Bibliografia\n- Manual\n### Edição\n2026";
    expect(splitFlashcardBibliography("Resposta.\n\n" + bibliography + "\n\n## Exemplo\nTexto.")).toEqual({ body, bibliography });
  });

  it("preserves source vocabulary and labels inside code samples", () => {
    const body = "Explique a fonte de alimentação.\n\n```\n## Fontes\n```";
    expect(splitFlashcardBibliography(body)).toEqual({ body, bibliography: "" });
  });
});
