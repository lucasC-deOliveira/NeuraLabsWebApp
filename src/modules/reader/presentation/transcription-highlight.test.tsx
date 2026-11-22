import { expect, it } from "vitest";
import { findTranscriptionHighlights } from "./transcription-highlight";

it("matches an exact citation across inline formatting without altering the document", () => {
  const transcription = document.createElement("div");
  transcription.innerHTML = "<p>Context: the <strong>retrieval</strong> practice \n improves recall.</p>";
  const original = transcription.innerHTML;
  const [range] = findTranscriptionHighlights(transcription, ["the **retrieval** practice improves recall"]);
  expect(range.toString().replace(/\s+/gu, " ")).toBe("the retrieval practice improves recall");
  expect(transcription.innerHTML).toBe(original);
});

it("keeps sources from other pages outside the highlight", () => {
  const transcription = document.createElement("div");
  transcription.innerHTML = "<p>Page seven has one citation.</p><p>Another paragraph begins here.</p>";
  const result = findTranscriptionHighlights(transcription, [
    "A citation from page eight",
    "citation. Another paragraph",
  ]);
  expect(result).toHaveLength(1);
  expect(result[0].startContainer).toBe(transcription.firstElementChild?.firstChild);
  expect(result[0].endContainer).toBe(transcription.lastElementChild?.firstChild);
});
