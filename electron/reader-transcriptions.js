const fs = require("node:fs/promises");
const path = require("node:path");
const { libraryPdfPath } = require("./vault-library-pdfs");
const { validateDirectoryChain } = require("./vault-paths");

const TRANSCRIPTIONS = ["Resources", "Bibliografia", "Transcricoes"];
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function transcriptionDirectory(vault, book) {
  const root = await fs.realpath(vault);
  await libraryPdfPath(root, book);
  const directory = path.join(root, ...TRANSCRIPTIONS);
  validateDirectoryChain(root, directory);
  return directory;
}

function sourceLink(header) {
  const match = /^\[PDF original\]\((?:<([^>\n]+)>|([^\n)]+))\)\s*(?:·\s*Páginas (\d+)–(\d+) do PDF)?/mu.exec(header);
  if (!match) return null;
  const destination = /^(?:\.\.\/){1,2}Arquivos\/([^#]+)(?:#page=(\d+))?$/u.exec(match[1] ?? match[2]);
  if (!destination) return null;
  try {
    const wholeBook = /\)\s*· Livro inteiro · Markdown/u.test(header.slice(match.index, match.index + 700));
    return { book: decodeURIComponent(destination[1]), first: Number(match[3] ?? destination[2]) || null, last: Number(match[4]) || null, wholeBook };
  } catch {
    return null;
  }
}

async function inspectTranscription(directory, identifier, book) {
  const parts = typeof identifier === "string" ? identifier.split("/") : [];
  const valid = parts.every((part) => part && part !== "." && part !== ".." && !/[\\:\0]/u.test(part));
  if (!valid || !parts.length || parts.length > 2 || !identifier.endsWith(".md")) return null;
  const target = path.join(directory, ...parts);
  validateDirectoryChain(directory, path.dirname(target));
  try {
    const stats = await fs.lstat(target);
    if (!stats.isFile() || stats.size > 60_000_000) return null;
    const handle = await fs.open(target, "r");
    try {
      const buffer = Buffer.alloc(4096);
      const { bytesRead } = await handle.read(buffer);
      const header = buffer.subarray(0, bytesRead).toString("utf8");
      const source = sourceLink(header);
      return source?.book === book ? { target, source, modifiedAt: stats.mtimeMs } : null;
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Finds existing Markdown exports whose source link points to this library PDF. */
async function listReaderTranscriptions(vault, book) {
  const directory = await transcriptionDirectory(vault, book);
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const matches = [];
  for (const entry of entries) {
    const identifier = entry.isDirectory() && !entry.name.startsWith(".")
      ? `${entry.name}/Livro.md` : entry.isFile() && entry.name.endsWith(".md") ? entry.name : null;
    if (!identifier) continue;
    const found = await inspectTranscription(directory, identifier, book);
    if (found) matches.push({ id: identifier, first: found.source.first, last: found.source.last, wholeBook: found.source.wholeBook, modifiedAt: found.modifiedAt });
  }
  return matches.sort((a, b) => b.modifiedAt - a.modifiedAt || a.id.localeCompare(b.id, "pt-BR"));
}

async function linkedTranscription(vault, book, id) {
  const directory = await transcriptionDirectory(vault, book);
  const found = await inspectTranscription(directory, id, book);
  if (!found) throw new Error("Unknown transcription. Expected a Markdown export linked to this PDF.");
  return found;
}

/** Opens a linked transcription for the in-app Markdown reader. */
async function readReaderTranscription(vault, book, id) {
  const { target } = await linkedTranscription(vault, book, id);
  return fs.readFile(target, "utf8");
}

/** Returns a figure located beside the linked Markdown export. */
async function readReaderTranscriptionImage(vault, book, id, name) {
  if (typeof name !== "string" || !/^[\w-]+\.png$/iu.test(name)) return null;
  const { target } = await linkedTranscription(vault, book, id);
  const directory = path.join(path.dirname(target), "imagens");
  validateDirectoryChain(path.dirname(target), directory);
  const file = path.join(directory, name);
  try {
    const info = await fs.lstat(file);
    if (!info.isFile() || info.size > 16 * 1024 * 1024) return null;
    const bytes = await fs.readFile(file);
    return bytes.subarray(0, 8).equals(PNG) ? bytes.toString("base64") : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Moves the selected linked export to the system trash, while preserving unrelated files. */
async function trashReaderTranscription(vault, book, id, trashItem) {
  const { target } = await linkedTranscription(vault, book, id);
  const selected = id.includes("/") ? await bundledTranscription(target) : target;
  try {
    await trashItem(selected);
    return "system";
  } catch {
    const directory = await transcriptionDirectory(vault, book);
    await moveToTranscriptionTrash(directory, selected);
    return "vault";
  }
}

async function bundledTranscription(target) {
  const directory = path.dirname(target);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const exportOnly = entries.every((entry) =>
    (entry.name === "Livro.md" && entry.isFile()) || (entry.name === "imagens" && entry.isDirectory()));
  return exportOnly && await hasOnlyExportedFigures(directory) ? directory : target;
}

async function moveToTranscriptionTrash(directory, selected) {
  const trash = path.join(directory, ".lixeira");
  validateDirectoryChain(directory, trash);
  await fs.mkdir(trash, { recursive: true });
  const entry = await fs.mkdtemp(path.join(trash, "transcricao-"));
  const destination = path.join(entry, path.relative(directory, selected));
  try {
    await fs.cp(selected, destination, { recursive: true, errorOnExist: true, force: false });
  } catch (error) {
    await fs.rm(entry, { recursive: true, force: true });
    throw error;
  }
  await fs.rm(selected, { recursive: true });
}

async function hasOnlyExportedFigures(directory) {
  try {
    const items = await fs.readdir(path.join(directory, "imagens"), { withFileTypes: true });
    return items.every((entry) => entry.isFile() && /^(?:p\d+-)?image_\d+_[a-f0-9]+\.png$/iu.test(entry.name));
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
}

module.exports = { listReaderTranscriptions, readReaderTranscription, readReaderTranscriptionImage, trashReaderTranscription };
