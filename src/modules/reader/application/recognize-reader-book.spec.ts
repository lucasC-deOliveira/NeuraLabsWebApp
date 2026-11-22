import { describe, expect, it, vi } from "vitest";
import type { ReaderOcrLanguage, ReaderOcrLine, ReaderOcrPage } from "@contracts/reader-ocr";
import { recognizeReaderBook } from "./recognize-reader-book";

class FakeBookPages {
  readonly pageCount = 3;
  readonly requested: number[] = [];

  async readPageText(page: number): Promise<string> {
    return page === 1 ? "A transcrição original desta página está disponível." : "";
  }

  async recognize(page: number, language: ReaderOcrLanguage): Promise<ReaderOcrPage> {
    this.requested.push(page);
    return { page, language, text: "Result." };
  }
}

function positionedLine(text: string, top: number, height = 12): ReaderOcrLine {
  return { text, confidence: 1, bounds: [[15, top], [160, top], [160, top + height], [15, top + height]] };
}

describe("book recognition", () => {
  it("preserves native pages, reuses OCR, and formats line geometry", async () => {
    const source = new FakeBookPages();
    const lines = [positionedLine("Heading", 0, 24), positionedLine("First line", 40),
      positionedLine("continues.", 54), positionedLine("New paragraph.", 110)];
    const cached: ReaderOcrPage[] = [{ page: 2, text: "cached", language: "en", lines }];
    const pages = await recognizeReaderBook(source, { cached, language: "en", signal: new AbortController().signal, onPage: vi.fn() });
    expect(source.requested).toEqual([3]);
    expect(pages).toEqual([await source.readPageText(1), "### Heading\n\nFirst line continues.\n\nNew paragraph.", "Result."]);
  });

  it("stops before starting the next page after cancellation", async () => {
    const source = new FakeBookPages();
    const controller = new AbortController();
    const onPage = (page: number): void => { if (page === 2) controller.abort(); };
    await expect(recognizeReaderBook(source, { cached: [], language: "en", signal: controller.signal, onPage }))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(source.requested).toEqual([]);
  });
});
