import { expect, it } from "vitest";
import { bookArgumentPassages } from "./book-argument-passages";

it("preserves chapter labels across conversion batches and bounds passage size", () => {
  const paragraphs = "The chapter discusses a result. ".repeat(240);
  const passages = bookArgumentPassages([`## Chapter 1\n${paragraphs}`, "## Páginas 31–60\nThe chapter continues in this batch."]);
  expect(passages.length).toBeGreaterThan(2);
  expect(passages.every(({ text, chapter }) => text.length <= 3900 && chapter === "Chapter 1")).toBe(true);
  expect(passages.at(-1)?.section).toBe(1);
});
