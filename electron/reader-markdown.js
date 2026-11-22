const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createInterface } = require("node:readline");
const { Readable } = require("node:stream");
const { libraryPdfPath } = require("./vault-library-pdfs");
const { validateDirectoryChain } = require("./vault-paths");

const MAX_DOCUMENT_BYTES = 160 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 70 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const EXPORT_DIRECTORY = "Resources/Bibliografia/Transcricoes";

function validateBookRequest({ language, jobId }) {
  if (!["pt", "en"].includes(language) || typeof jobId !== "string" || !/^[a-f0-9-]{36}$/u.test(jobId)) {
    throw new Error("Invalid book conversion. Expected language pt or en and a job ID.");
  }
}

async function convertPdf(source, size, language, signal) {
  const response = await fetch(`http://127.0.0.1:5003/book?language=${language}`, {
    method: "POST", body: createReadStream(source), duplex: "half",
    headers: { "Content-Type": "application/pdf", "Content-Length": String(size) },
    redirect: "error", signal,
  });
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    throw new Error(`Unexpected conversion response HTTP ${response.status}. Expected a document stream.`);
  }
  return createInterface({ input: Readable.fromWeb(response.body), crlfDelay: Infinity });
}

function validateExport({ markdown, images }) {
  if (typeof markdown !== "string" || markdown.length > 4_000_000 || !Array.isArray(images) || images.length > 1000) {
    throw new Error("Invalid document export. Expected Markdown and PNG figures.");
  }
  const files = new Map();
  for (const { name, base64 } of images) {
    if (typeof name !== "string" || !/^[a-zA-Z0-9_-]+\.png$/u.test(name) || files.has(name) || typeof base64 !== "string") {
      throw new Error("Invalid figure export. Expected unique PNG filenames.");
    }
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Invalid document figure. Expected PNG data.");
    files.set(name, bytes);
  }
  return { markdown, files };
}

/** Streams a full conversion and publishes one Markdown export per book. */
async function saveReaderMarkdown(vault, request, onProgress = () => {}) {
  validateBookRequest(request);
  const root = await fs.realpath(vault);
  const source = await libraryPdfPath(root, request.relative);
  const initial = await fs.stat(source);
  if (initial.size > MAX_DOCUMENT_BYTES) throw new Error("PDF exceeds the local conversion size limit.");
  const folder = readerExportFolder(request.relative);
  const directory = await prepareExportDirectory(root, folder);
  return publishReaderExport(directory, folder, source, initial, request, onProgress);
}

function readerExportFolder(relative) {
  const name = path.posix.parse(relative).name.replace(/[^\p{L}\p{N} _.-]/gu, "_").slice(0, 65) || "Documento";
  const id = createHash("sha256").update(relative).digest("hex").slice(0, 12);
  return `${name}-livro-${id}`;
}

async function prepareExportDirectory(root, folder) {
  const directory = path.join(root, EXPORT_DIRECTORY);
  validateDirectoryChain(root, directory);
  await fs.mkdir(directory, { recursive: true });
  const existing = await fs.lstat(path.join(directory, folder)).catch(missingExport);
  if (existing) throw new Error("This book already has a transcription. Delete it before creating another.");
  return directory;
}

function missingExport(error) {
  if (error.code !== "ENOENT") throw error;
  return null;
}

async function publishReaderExport(directory, folder, source, initial, request, onProgress) {
  const temporary = await fs.mkdtemp(path.join(directory, ".docling-"));
  const execution = new AbortController();
  try {
    await startReaderExport(temporary, request.relative);
    const stream = await convertPdf(source, initial.size, request.language, execution.signal);
    const imageCount = await saveConversionStream(stream, temporary, request.jobId, onProgress);
    const current = await fs.stat(source);
    if (current.mtimeMs !== initial.mtimeMs || current.ctimeMs !== initial.ctimeMs || current.size !== initial.size) {
      throw new Error("PDF changed during conversion.");
    }
    await publishCompletedBook(temporary, path.join(directory, folder));
    return { markdownPath: `${EXPORT_DIRECTORY}/${folder}/Livro.md`, imageCount };
  } catch (error) {
    execution.abort();
    throw error;
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

async function publishCompletedBook(temporary, destination) {
  await fs.mkdir(destination);
  try {
    await fs.cp(path.join(temporary, "imagens"), path.join(destination, "imagens"), { recursive: true });
    await fs.copyFile(path.join(temporary, "Livro.md"), path.join(destination, "Livro.md"));
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}

async function startReaderExport(directory, relative) {
  const source = relative.split("/").map(encodeURIComponent).join("/");
  const title = path.posix.parse(relative).name.replace(/[\r\n]+/gu, " ").replace(/[[\]`*_<>]/gu, "\\$&");
  await fs.mkdir(path.join(directory, "imagens"));
  await fs.writeFile(path.join(directory, "Livro.md"), `# ${title}\n\n[PDF original](<../../Arquivos/${source}>) · Livro inteiro · Markdown\n\n`, "utf8");
}

async function saveConversionStream(stream, directory, jobId, onProgress) {
  let total = 0;
  let completed = 0;
  let imageCount = 0;
  for await (const line of stream) {
    if (line.length > MAX_RESPONSE_BYTES) throw new Error("Document export batch exceeds the local size limit.");
    const batch = JSON.parse(line);
    if (batch.type === "started" && !total && Number.isSafeInteger(batch.total) && batch.total > 0) {
      total = batch.total;
      onProgress({ jobId, completed, total });
      continue;
    }
    if (batch.type === "finished" && total && completed === total) return imageCount;
    if (batch.type !== "pages" || !total || batch.first !== completed + 1 ||
      !Number.isSafeInteger(batch.last) || batch.last < batch.first || batch.last > total) throw new Error("Incomplete document conversion.");
    imageCount += await appendConversionBatch(directory, batch);
    completed = batch.last;
    onProgress({ jobId, completed, total });
  }
  throw new Error("Document stream ended before all pages were converted.");
}

async function appendConversionBatch(directory, batch) {
  const { markdown, files } = validateExport(batch);
  const prefix = `p${batch.first}-`;
  for (const [name, bytes] of files) await fs.writeFile(path.join(directory, "imagens", prefix + name), bytes);
  const content = markdown.trim().replace(/\]\((<?)imagens\//gu, `]($1imagens/${prefix}`);
  const heading = batch.first === batch.last ? `Página ${batch.first}` : `Páginas ${batch.first}–${batch.last}`;
  await fs.appendFile(path.join(directory, "Livro.md"), `<!-- neuralabs-reader-batch -->\n## ${heading}\n\n${content}\n\n`, "utf8");
  return files.size;
}

module.exports = { saveReaderMarkdown };
