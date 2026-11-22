import { expect, it } from "vitest";
import { transcriptPageSections } from "./transcription-page";

it("keeps individual physical page numbers and ignores legacy grouped headings", () => {
  const separator = "<!-- neuralabs-reader-batch -->\n";
  const source = `# Book\n${separator}## Páginas 1–30\nLegacy\n${separator}## Página 31\nNew export part\n`;
  const pages = transcriptPageSections(source);
  expect(pages.has(1)).toBe(false);
  expect(pages.get(31)).toContain("New export part");
});
