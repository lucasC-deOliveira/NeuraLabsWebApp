const bibliographyLabel = /^(?:fonte[s]?|bibliografia|referência[s]?(?: bibliográfica[s]?)?)(?:\s*:|\s*$)/iu;
const heading = /^\s{0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/u;
const fence = /^\s{0,3}(`{3,}|~{3,})/u;

function isBibliographyLabel(line: string): boolean {
  return bibliographyLabel.test(line.replace(/^\s*(?:>\s*)?(?:[-+*]\s+)?/u, "").replace(/[*_]/gu, ""));
}

/** Separates labeled citations from study content, e.g. splitFlashcardBibliography("Answer\n\n> **Fonte:** RFC 2131"). */
export function splitFlashcardBibliography(markdown: string): { body: string; bibliography: string } {
  const body: string[] = [];
  const bibliography: string[] = [];
  let sourceHeading: number | null = null;
  let sourceQuote = false;
  let openFence: string | null = null;

  for (const line of markdown.split(/\r?\n/u)) {
    const marker = fence.exec(line)?.[1];
    const fenced = openFence !== null || marker !== undefined;
    if (marker) {
      if (openFence === null) openFence = marker;
      else if (marker.startsWith(openFence) && /^\s*[`~]+\s*$/u.test(line)) openFence = null;
    }
    const section = fenced ? null : heading.exec(line);
    if (section && sourceHeading !== null && section[1].length <= sourceHeading) sourceHeading = null;
    const startsSource = !fenced && isBibliographyLabel(section?.[2] ?? line);
    if (section && startsSource) sourceHeading = section[1].length;
    const quote = /^\s*>/u.test(line);
    sourceQuote = quote && (sourceQuote || startsSource);
    const output = sourceHeading !== null || sourceQuote || startsSource ? bibliography : body;
    output.push(line);
  }

  return { body: body.join("\n").trim(), bibliography: bibliography.join("\n").trim() };
}
