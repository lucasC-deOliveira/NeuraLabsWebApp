const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { libraryPdfPath } = require("./vault-library-pdfs");
const { validateDirectoryChain } = require("./vault-paths");
const { replaceVaultFile } = require("./vault-study-store");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LANGUAGES = new Set(["pt", "en"]);

async function documentCache(vault, relative) {
  const target = await libraryPdfPath(vault, relative);
  const stats = await fs.promises.stat(target);
  const revision = createHash("sha256").update(JSON.stringify([relative, stats.size, stats.mtimeMs, stats.ctimeMs])).digest("hex");
  const root = await fs.promises.realpath(vault);
  const directory = path.join(root, ".neuralabs", "reader-ocr", revision);
  validateDirectoryChain(root, directory);
  return { root, revision, directory };
}

function readCachedPage(directory, name) {
  const file = path.join(directory, name);
  try {
    if (!fs.lstatSync(file).isFile()) return null;
    const result = JSON.parse(fs.readFileSync(file, "utf8"));
    return LANGUAGES.has(result?.language) && typeof result?.text === "string" ? result : null;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

/** Reads the OCR text for the current revision, e.g. loadReaderOcr(vault, "Book.pdf"). */
async function loadReaderOcr(vault, relative) {
  const { directory, revision } = await documentCache(vault, relative);
  if (!fs.existsSync(directory)) return { revision, pages: [] };
  const pages = fs.readdirSync(directory).filter((name) => /^[1-9][0-9]{0,5}\.json$/u.test(name))
    .flatMap((name) => {
      const content = readCachedPage(directory, name);
      return content ? [{ ...content, page: Number.parseInt(name, 10) }] : [];
    });
  return { revision, pages };
}

async function recognizePage(image, language) {
  const port = Number(process.env.READER_OCR_PORT ?? 5002);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local OCR port.");
  const url = `http://127.0.0.1:${port}/recognize?language=${language}`;
  const response = await fetch(url, {
    method: "POST", body: image, headers: { "Content-Type": "image/png" },
    redirect: "error", signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`OCR service returned HTTP ${response.status}.`);
  const { lines } = await response.json();
  if (!Array.isArray(lines) || lines.some((line) => typeof line?.text !== "string")) {
    throw new Error("Invalid OCR response. Expected recognized lines.");
  }
  return lines;
}

/** Recognizes and stores one page, e.g. saveReaderOcr(vault, request). */
async function saveReaderOcr(vault, { relative, revision, page, language, image }) {
  if (!LANGUAGES.has(language) || !Number.isInteger(page) || page < 1 || page > 999999 ||
    !ArrayBuffer.isView(image) || image.byteLength === 0 || image.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Invalid OCR request. Expected a page number, supported language and PNG image.");
  }
  const cache = await documentCache(vault, relative);
  if (cache.revision !== revision) throw new Error("Document revision changed. Reopen the PDF.");
  const lines = await recognizePage(image, language);
  if ((await documentCache(vault, relative)).revision !== revision) throw new Error("Document revision changed during OCR.");
  const result = { page, language, text: lines.map(({ text }) => text).join("\n"), lines };
  fs.mkdirSync(cache.directory, { recursive: true });
  validateDirectoryChain(cache.root, cache.directory);
  replaceVaultFile(path.join(cache.directory, `${page}.json`), JSON.stringify(result) + "\n");
  return result;
}

module.exports = { loadReaderOcr, saveReaderOcr };
