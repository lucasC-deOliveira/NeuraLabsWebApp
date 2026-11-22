const fs = require("node:fs/promises");
const { COPYFILE_EXCL } = require("node:fs").constants;
const path = require("node:path");

const LIBRARY = ["Resources", "Bibliografia", "Arquivos"];

async function libraryRoot(vault, create = false) {
  const root = await fs.realpath(vault);
  let directory = root;
  for (const part of LIBRARY) {
    directory = path.join(directory, part);
    if (create) await fs.mkdir(directory).catch(ignoreExistingDirectory);
    if (!(await fs.lstat(directory)).isDirectory()) throw new Error("Expected a regular bibliography directory.");
  }
  return directory;
}

function ignoreExistingDirectory(error) {
  if (error.code !== "EEXIST") throw error;
}

/** Lists selectable PDF sources in the configured bibliography, e.g. listLibraryPdfs(vault). */
async function listLibraryPdfs(vault) {
  if (!vault) return [];
  try {
    const root = await libraryRoot(vault);
    return (await collectPdfs(root, "")).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function collectPdfs(root, relative) {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collectPdfs(root, child));
    if (entry.isFile() && /\.pdf$/i.test(entry.name)) files.push({ path: child, name: entry.name });
  }
  return files;
}

/** Reads a regular PDF under the configured library, e.g. readLibraryPdf(vault, "Manual.pdf"). */
async function readLibraryPdf(vault, relative) {
  const target = await libraryPdfPath(vault, relative);
  return new Uint8Array(await fs.readFile(target));
}

async function libraryPdfPath(vault, relative) {
  const parts = typeof relative === "string" ? relative.split("/") : [];
  if (!vault || !parts.length || parts.some((part) => !part || part === "." || part === ".." || /[\\:\0]/u.test(part)) || !/\.pdf$/i.test(relative)) {
    throw new Error("Invalid bibliography path. Expected a relative PDF path.");
  }
  let target = await libraryRoot(vault);
  for (const part of parts.slice(0, -1)) {
    target = path.join(target, part);
    if (!(await fs.lstat(target)).isDirectory()) throw new Error("Expected a regular bibliography directory.");
  }
  target = path.join(target, parts.at(-1));
  if (!(await fs.lstat(target)).isFile()) throw new Error("Expected a regular PDF file.");
  return target;
}

/** Copies a selected PDF to the vault, e.g. importLibraryPdf(vault, selectedFile). */
async function importLibraryPdf(vault, selectedFile) {
  const source = await fs.realpath(selectedFile);
  const name = path.basename(selectedFile);
  if (!/\.pdf$/i.test(name) || !(await fs.stat(source)).isFile() || !(await hasPdfHeader(source))) {
    throw new Error("Invalid library import. Expected a PDF file.");
  }
  const root = await libraryRoot(vault, true);
  const existing = path.relative(root, source);
  if (existing && !path.isAbsolute(existing) && existing.split(path.sep)[0] !== ".." && /\.pdf$/i.test(existing)) {
    return { path: existing.split(path.sep).join("/"), name: path.basename(existing) };
  }
  const copied = await copyUniquePdf(source, root, name);
  return { path: copied, name: copied };
}

async function hasPdfHeader(file) {
  const handle = await fs.open(file, "r");
  try {
    const bytes = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(bytes);
    return bytes.subarray(0, bytesRead).includes("%PDF-");
  } finally {
    await handle.close();
  }
}

async function copyUniquePdf(source, root, name) {
  const { name: stem, ext } = path.parse(name);
  for (let version = 1; ; version++) {
    const candidate = version === 1 ? name : `${stem} (${version})${ext}`;
    try {
      await fs.copyFile(source, path.join(root, candidate), COPYFILE_EXCL);
      return candidate;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
}

module.exports = { listLibraryPdfs, readLibraryPdf, libraryPdfPath, importLibraryPdf };
