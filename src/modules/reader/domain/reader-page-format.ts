import type { ReaderOcrLine, ReaderOcrPage } from "@contracts/reader-ocr";

interface PositionedLine { text: string; top: number; left: number; height: number }

function positioned(line: ReaderOcrLine): PositionedLine | null {
  if (!line.text.trim() || !Array.isArray(line.bounds) || line.bounds.length < 3) return null;
  const tops = line.bounds.map((point) => point[1]);
  const left = Math.min(...line.bounds.map((point) => point[0]));
  const top = Math.min(...tops);
  const height = Math.max(...tops) - top;
  return [left, top, height].every(Number.isFinite) ? { text: line.text.trim(), top, left, height } : null;
}

function startNewBlock(previous: PositionedLine, line: PositionedLine, typicalHeight: number): boolean {
  const difference = line.top - previous.top;
  return difference > typicalHeight * 1.85 || difference < -typicalHeight
    || Math.abs(line.left - previous.left) > typicalHeight * 2.3;
}

function escapeLiteral(text: string): string {
  return text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
    .replace(/[[\]`*_]/gu, "\\$&").replace(/^(#{1,6}|[-+]|\d+\.)\s/u, "\\$&");
}

/** Reconstructs OCR paragraphs using line geometry, e.g. formatRecognizedPage(page). */
export function formatRecognizedPage(page: ReaderOcrPage): string {
  const lines = (page.lines ?? []).flatMap((raw) => {
    const line = positioned(raw);
    return line ? [line] : [];
  });
  if (!lines.length || lines.length !== page.lines?.length) return formatEmbeddedPage(page.text);
  const heights = lines.map(({ height }) => height).sort((a, b) => a - b);
  const typicalHeight = Math.max(1, heights[Math.floor(heights.length / 2)]);
  const content = lines.map((line, index) => formattedLine(line, lines[index - 1], typicalHeight));
  return content.join("").replace(/\n{3,}/gu, "\n\n").trim();
}

function formattedLine(line: PositionedLine, previous: PositionedLine | undefined, typicalHeight: number): string {
  const text = escapeLiteral(line.text);
  const heading = line.height > typicalHeight * 1.45 && line.text.length <= 100;
  if (heading) return `\n\n### ${text}\n\n`;
  if (!previous || startNewBlock(previous, line, typicalHeight)) return `\n\n${text}`;
  return ` ${text}`;
}

/** Keeps extracted text and its explicit line breaks, e.g. formatEmbeddedPage(rawText). */
export function formatEmbeddedPage(rawText: string): string {
  return rawText.split(/\r?\n/u).map(escapeLiteral).join("\n").trim();
}

/** Detects when the PDF already contains meaningful text, e.g. hasEmbeddedPageText("A full passage."). */
export function hasEmbeddedPageText(text: string): boolean {
  return (text.match(/\p{L}/gu)?.length ?? 0) >= 24;
}
