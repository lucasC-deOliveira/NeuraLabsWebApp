import { describe, expect, it } from "vitest";
import { formatReaderCitation } from "../domain/reader-citation";
import { searchReaderPages } from "./search-reader-pages";

class FakeReaderPages {
  readonly pageCount = 3;
  private readonly pages = ["Introdução.", "A concordância\n  verbal tem regras.", "CONCORDÂNCIA NOMINAL."];

  async readPageText(page: number): Promise<string> {
    return this.pages[page - 1];
  }
}

describe("local document search", () => {
  it("matches accents and spacing while preserving the original text and PDF page", async () => {
    const found = await searchReaderPages(new FakeReaderPages(), "CONCORDANCIA VERBAL", new AbortController().signal);
    expect(found).toEqual([{ page: 2, excerpt: "A concordância verbal tem regras." }]);
    expect(formatReaderCitation("Manual.pdf", found[0])).toBe("“A concordância verbal tem regras.” — Manual.pdf, página 2 do PDF.");
  });

  it("stops when the reader closes", async () => {
    const execution = new AbortController();
    execution.abort();
    await expect(searchReaderPages(new FakeReaderPages(), "verbal", execution.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
