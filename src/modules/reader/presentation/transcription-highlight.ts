type TextPosition = { node: Text; offset: number };
type TextIndex = { text: string; positions: TextPosition[] };

const blockSelector = "p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote";

function appendText(index: TextIndex, node: Text): void {
  for (let offset = 0; offset < node.length; offset++) {
    const character = node.data[offset];
    const normalized = /\s/u.test(character) ? " " : character;
    if (normalized === " " && index.text.endsWith(" ")) continue;
    index.text += normalized;
    index.positions.push({ node, offset });
  }
}

function transcriptionTextIndex(container: HTMLElement): TextIndex {
  const index: TextIndex = { text: "", positions: [] };
  const iterator = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let previous: Element | null = null;
  for (let current = iterator.nextNode(); current; current = iterator.nextNode()) {
    const node = current as Text;
    const block = node.parentElement?.closest(blockSelector) ?? null;
    if (previous !== block && index.text && !index.text.endsWith(" ")) {
      index.text += " ";
      index.positions.push({ node, offset: 0 });
    }
    appendText(index, node);
    previous = block;
  }
  return index;
}

function quoteRange(index: TextIndex, quote: string): Range | null {
  const plain = quote.replace(/\s+/gu, " ").trim();
  if (!plain) return null;
  const rendered = plain
    .replace(/\[([^\]]+)\]\([^()]*\)/gu, "$1")
    .replace(/(\*{1,2}|_{1,2}|`)(.+?)\1/gu, "$2")
    .replace(/\s+/gu, " ").trim();
  const normalized = index.text.includes(plain) ? plain : rendered;
  if (!normalized) return null;
  const start = index.text.indexOf(normalized);
  if (start < 0) return null;
  const first = index.positions[start];
  const last = index.positions[start + normalized.length - 1];
  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset + 1);
  return range;
}

/** Matches rendered text across inline Markdown boundaries without changing the document.
 * @example findTranscriptionHighlights(pane, ["The exact citation"])
 */
export function findTranscriptionHighlights(pane: HTMLElement, citations: readonly string[]): Range[] {
  const index = transcriptionTextIndex(pane);
  return citations.map((quote) => quoteRange(index, quote)).filter((match) => match !== null);
}
