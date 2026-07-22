import { describe, it, expect } from "vitest";
import { splitSentences } from "./sentence-split";

describe("splitSentences", () => {
  it("splits on sentence-ending punctuation, keeping it", () => {
    expect(splitSentences("A célula se divide. Depois vem a mitose!")).toEqual([
      "A célula se divide.",
      "Depois vem a mitose!",
    ]);
  });

  it("handles ? and … and multiple spaces", () => {
    expect(splitSentences("O que é isso?   Não sei…")).toEqual(["O que é isso?", "Não sei…"]);
  });

  it("splits on newlines (lists/paragraphs)", () => {
    expect(splitSentences("Item um\nItem dois\n\nItem três")).toEqual([
      "Item um",
      "Item dois",
      "Item três",
    ]);
  });

  it("returns a single sentence when there is no boundary", () => {
    expect(splitSentences("O que é mitose")).toEqual(["O que é mitose"]);
  });

  it("returns nothing for blank text", () => {
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences("")).toEqual([]);
  });
});
