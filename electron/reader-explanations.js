const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { libraryPdfPath } = require("./vault-library-pdfs");
const { validateDirectoryChain } = require("./vault-paths");
const { listReaderTranscriptions, readReaderTranscription } = require("./reader-transcriptions");

const validId = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const titles = new Map([
  ["explain", "Explicação"], ["simplify", "Explicação simplificada"],
  ["analogy", "Analogia"], ["summary", "Resumo"],
]);

async function explanationsDirectory(vault, book, page, wholeBook = false) {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error(`Invalid page: ${page}. Expected a positive integer.`);
  const root = await fs.realpath(vault);
  await libraryPdfPath(root, book);
  const bookId = createHash("sha256").update(book).digest("hex").slice(0, 24);
  const directory = path.join(root, "Resources", "Bibliografia", "Anotacoes", bookId, wholeBook ? "sinteses" : `pagina-${page}`);
  validateDirectoryChain(root, directory);
  return directory;
}

async function explanationSource(vault, book, page) {
  const items = await listReaderTranscriptions(vault, book);
  const selected = items.find(({ wholeBook }) => wholeBook);
  if (!selected) return null;
  const content = await readReaderTranscription(vault, book, selected.id);
  const [, ...sections] = content.split(/^<!-- neuralabs-reader-batch -->\r?\n/mu);
  const section = sections.findIndex((text) => text.split(/\r?\n/u, 1)[0].trimEnd() === `## Página ${page}`);
  return section === -1 ? null : { transcription: selected.id, section };
}

function explanationMarkdown(page, explanation, source, references) {
  const { id, mode, question, answer } = explanation ?? {};
  if (typeof id !== "string" || !validId.test(id) || !titles.has(mode) ||
      typeof question !== "string" || question.length > 1200 ||
      typeof answer !== "string" || !answer.trim() || answer.length > 16000) {
    throw new Error("Invalid reader explanation. Expected a supported mode and bounded question and answer.");
  }
  const destination = source?.transcription.split("/").map(encodeURIComponent).join("/");
  const reference = destination ? `[Transcrição · Página ${page}](<../../../Transcricoes/${destination}#${encodeURIComponent(`Página ${page}`)}>)\n` : "";
  const request = question.trim() ? `\n## Pedido\n\n${question.trim()}\n` : "";
  const scope = explanation.scope === "book" ? "Síntese do livro" : `Página ${page}`;
  return `# ${titles.get(mode)} · ${scope}\n\n${reference}${request}\n## Resposta da IA\n\n${answer.trim()}\n${bookReferenceMarkdown(references)}`;
}

function bookReferenceMarkdown(references) {
  if (!references.length) return "";
  const metadata = encodeURIComponent(JSON.stringify(references));
  const links = references.map(({ transcription, page, chapter, quote }) => {
    const file = transcription.split("/").map(encodeURIComponent).join("/");
    const heading = encodeURIComponent(`Página ${page}`);
    return `[Página ${page}](<../../../Transcricoes/${file}#${heading}>)${chapter ? ` · ${chapter}` : ""}\n\n> ${quote}\n`;
  });
  return `\n<!-- neuralabs-book-references ${metadata} -->\n## Fontes citadas\n\n${links.join("\n")}`;
}

function savedBookReferences(markdown) {
  const encoded = /^<!-- neuralabs-book-references (\S+) -->$/mu.exec(markdown)?.[1];
  if (!encoded) return [];
  try {
    const references = JSON.parse(decodeURIComponent(encoded));
    return Array.isArray(references) ? references.filter(validBookReference).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function validBookReference(reference) {
  return Number.isSafeInteger(reference?.page) && reference.page > 0 &&
    Number.isSafeInteger(reference.section) && reference.section >= 0 &&
    typeof reference.transcription === "string" &&
    /^(?:(?!\.{1,2}\/)[^/\\:\r\n]+\/)?(?!\.{1,2}$)[^/\\:\r\n]+\.md$/u.test(reference.transcription) &&
    typeof reference.quote === "string" && reference.quote.length <= 900 && !/[\r\n]/u.test(reference.quote) &&
    (reference.chapter === undefined || (typeof reference.chapter === "string" && reference.chapter.length <= 140 && !/[\r\n]/u.test(reference.chapter)));
}

async function approvedBookReferences(vault, book, explanation) {
  if (explanation?.scope !== "book") return [];
  const references = explanation.references ?? [];
  if (!Array.isArray(references) || references.length > 6 || !references.every(validBookReference)) {
    throw new Error("Invalid book references. Expected up to six page citations.");
  }
  if (!references.length) return [];
  const available = new Set((await listReaderTranscriptions(vault, book)).map(({ id }) => id));
  if (references.some(({ transcription }) => !available.has(transcription))) throw new Error("Citation transcription does not belong to this book.");
  return references;
}

/** Saves an explicitly approved explanation as ordinary Markdown in the vault. */
async function saveReaderExplanation(vault, book, page, explanation) {
  const wholeBook = explanation?.scope === "book";
  const directory = await explanationsDirectory(vault, book, page, wholeBook);
  const references = await approvedBookReferences(vault, book, explanation);
  const source = explanation?.scope === "book" ? null : await explanationSource(vault, book, page);
  const markdown = explanationMarkdown(page, explanation, source, references);
  await fs.mkdir(directory, { recursive: true });
  const target = path.join(directory, `${explanation.id}.md`);
  try {
    await fs.writeFile(target, markdown, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST" || !(await fs.lstat(target)).isFile() || await fs.readFile(target, "utf8") !== markdown) throw error;
  }
  return { id: explanation.id, markdown, source, ...(wholeBook ? { scope: "book", references } : {}) };
}

/** Lists approved notes for the selected book and page. */
async function listReaderExplanations(vault, book, page) {
  const [current, whole] = await Promise.all([
    listExplanationFolder(vault, book, page, false), listExplanationFolder(vault, book, page, true),
  ]);
  return [...current, ...whole];
}

async function listExplanationFolder(vault, book, page, wholeBook) {
  const directory = await explanationsDirectory(vault, book, page, wholeBook);
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const notes = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && validId.test(entry.name.slice(0, -3)));
  if (!notes.length) return [];
  const source = wholeBook ? null : await explanationSource(vault, book, page);
  return Promise.all(notes.map(async ({ name }) => {
    const markdown = await fs.readFile(path.join(directory, name), "utf8");
    return { id: name.slice(0, -3), markdown, source, ...(wholeBook ? { scope: "book", references: savedBookReferences(markdown) } : {}) };
  }));
}

module.exports = { saveReaderExplanation, listReaderExplanations };
