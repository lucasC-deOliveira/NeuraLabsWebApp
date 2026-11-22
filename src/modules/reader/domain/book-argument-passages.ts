export interface ArgumentPassage {
  section: number;
  chapter: string;
  text: string;
}

const passageSize = 3900;

function passageWindows(text: string): string[] {
  const windows: string[] = [];
  for (let start = 0; start < text.length;) {
    const end = Math.min(text.length, start + passageSize);
    windows.push(text.slice(start, end).trim());
    if (end === text.length) break;
    const overlap = text.lastIndexOf(" ", end - 200);
    start = overlap > start ? overlap + 1 : end;
  }
  return windows;
}

/** Splits Markdown into bounded passages while retaining their source section.
 * @example bookArgumentPassages(["## Chapter 1\nThe author argues..."])
 */
export function bookArgumentPassages(sections: readonly string[]): ArgumentPassage[] {
  let chapter = "Início do livro";
  return sections.flatMap((markdown, section) => {
    const parts = markdown.split(/^#{1,6} +([^\n]+)\r?$/gmu);
    return chapterPassages(parts, section, chapter, (next) => { chapter = next; });
  });
}

function chapterPassages(parts: string[], section: number, previous: string, setChapter: (value: string) => void): ArgumentPassage[] {
  const passages: ArgumentPassage[] = [];
  let chapter = previous;
  for (let index = 0; index < parts.length; index += 2) {
    const heading = parts[index - 1]?.trim();
    if (heading && !/^Página(?:s \d+–| )\d+$/u.test(heading)) chapter = heading.slice(0, 250);
    const text = parts[index].replace(/^!?\[(?:PDF original|[^\]]*)\]\([^\n]*\)\s*$/gmu, "").replace(/\s+/gu, " ").trim();
    if (text.length >= 20) passages.push(...passageWindows(text).map((window) => ({ section, chapter, text: window })));
  }
  setChapter(chapter);
  return passages;
}
