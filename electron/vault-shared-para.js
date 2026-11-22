const fs = require("node:fs");
const path = require("node:path");
const { replaceVaultFile } = require("./vault-study-store");
const { vaultGraphLocation } = require("./vault-paths");

const PARA = ["Projects", "Areas", "Resources", "Archives"];
const MANIFEST = ".neuralabs-graph.json";
const MEMBERS = ".neuralabs-members.json";
const safeId = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const INDEX_START = "<!-- neuralabs:members:start -->";
const INDEX_END = "<!-- neuralabs:members:end -->";
const scoped = new Set(["grafo", "relacoes", "pesoEdital", "posicao"]);

function readOptional(file) {
  try {
    if (!fs.lstatSync(file).isFile()) throw new Error(`Expected a regular vault file: ${file}`);
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function readSharedManifest(directory) {
  const raw = readOptional(path.join(directory, MANIFEST));
  if (raw === null) return null;
  // Legacy manifests remain handled by their original storage path.
  let manifest;
  try { manifest = JSON.parse(raw); } catch { return null; }
  return manifest?.layout === "shared-para" && typeof manifest.id === "string" && safeId.test(manifest.id) ? manifest : null;
}

function splitMarkdown(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(markdown);
  if (!match) throw new Error("Invalid vault note. Expected YAML frontmatter.");
  const lines = match[1].split(/\r?\n/);
  const groups = [];
  for (const line of lines) {
    const key = /^([\w-]+):(?:\s|$)/.exec(line)?.[1];
    if (key || groups.length === 0) groups.push({ key, lines: [line] });
    else groups.at(-1).lines.push(line);
  }
  const id = /^id:\s*['"]?([\w-]+)['"]?\s*$/.exec(groups.find((group) => group.key === "id")?.lines[0] ?? "")?.[1];
  if (!id || !safeId.test(id)) throw new Error("Invalid vault note ID. Expected letters, numbers, dashes or underscores.");
  return { id, groups, body: match[2] };
}

function markdownFromGroups(groups, body) {
  const header = groups.flatMap((group) => group.lines).join("\n");
  return `---\n${header}\n---\n${body}`;
}

function splitGraphNote(markdown) {
  const { id, groups, body } = splitMarkdown(markdown);
  const canonical = groups.filter(({ key }) => !scoped.has(key));
  const title = canonical.find(({ key }) => key === "titulo");
  if (title?.lines.length === 1 && !canonical.some(({ key }) => key === "aliases")) {
    const value = title.lines[0].slice("titulo:".length).trim();
    if (value && !/^[|>]/.test(value)) canonical.push({ key: "aliases", lines: ["aliases:", `  - ${value}`] });
  }
  const label = title?.lines[0].slice("titulo:".length).trim().replace(/^['"]|['"]$/g, "");
  return {
    id, label: label?.replace(/[|\[\]\r\n]/g, " "),
    canonical: markdownFromGroups(canonical, body),
    fields: groups.filter(({ key }) => scoped.has(key) && key !== "grafo").flatMap(({ lines }) => lines),
  };
}

function projectGraphNote(canonical, graphId, fields) {
  const { groups, body } = splitMarkdown(canonical);
  const shared = groups.filter(({ key }) => !scoped.has(key));
  return markdownFromGroups([...shared, { lines: [`grafo: ${graphId}`, ...fields] }], body);
}

function paraPath(root, relative) {
  const parts = relative.replace(/\\/g, "/").split("/");
  if (parts.length !== 2 || !PARA.includes(parts[0]) || !/^[^/\\:]+\.md$/i.test(parts[1])) return null;
  const directory = path.join(root, parts[0]);
  if (fs.existsSync(directory) && (!fs.lstatSync(directory).isDirectory() || fs.realpathSync(directory) !== path.join(fs.realpathSync(root), parts[0]))) {
    throw new Error("Invalid PARA directory. Expected a folder inside the selected vault.");
  }
  return path.join(directory, parts[1]);
}

function sharedGraph(root, directory, manifest = readSharedManifest(directory)) {
  if (!manifest) return null;
  if (typeof manifest.id !== "string" || !safeId.test(manifest.id)) throw new Error("Invalid shared graph ID.");
  const location = vaultGraphLocation(root, directory);
  if (!location || location.id !== manifest.id) {
    throw new Error("Invalid shared graph location. Expected a graph inside the selected vault.");
  }
  const { root: vault, dir } = location;
  const filename = path.join(dir, MEMBERS);
  const raw = readOptional(filename);
  const members = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(members) || members.some((entry) => !entry || typeof entry.id !== "string" ||
    !safeId.test(entry.id) || !Array.isArray(entry.fields) ||
    !PARA.includes(entry.folder) || entry.fields.some((line) => typeof line !== "string"))) {
    throw new Error("Invalid shared graph membership file.");
  }
  return { root: vault, dir, manifest, filename, raw, members };
}

function canonicalNote(graph, id, preferred) {
  const paths = PARA.map((folder) => paraPath(graph.root, `${folder}/${id}.md`));
  const matches = paths.flatMap((target) => {
    const content = readOptional(target);
    return content === null ? [] : [{ target, content }];
  });
  if (matches.length > 1) throw new Error(`Há mais de um Markdown com o ID ${id} no vault.`);
  return matches[0] ?? { target: paraPath(graph.root, `${preferred}/${id}.md`), content: null };
}

function readSharedGraphFiles(graph, since = null, ids = null) {
  const membershipTime = since === null || graph.raw === null ? 0 : fs.statSync(graph.filename).mtimeMs;
  return graph.members.flatMap((member) => {
    if (ids && !ids.has(member.id)) return [];
    const { target, content } = canonicalNote(graph, member.id, member.folder);
    if (content === null) throw new Error(`O Markdown ${member.id}.md está faltando no PARA compartilhado.`);
    if (splitMarkdown(content).id !== member.id) throw new Error(`O ID de ${member.id}.md foi alterado.`);
    if (since !== null && Math.max(membershipTime, fs.statSync(target).mtimeMs) <= since) return [];
    return [{ relPath: `${member.folder}/${member.id}.md`, content: projectGraphNote(content, graph.manifest.id, member.fields) }];
  });
}

function graphIndex(graph, members, current) {
  const graphTitle = String(graph.manifest.name).replace(/[\r\n]+/g, " ");
  const links = members.map(({ id, label }) => label ? `- [[${id}|${label}]]` : `- [[${id}]]`).join("\n");
  const block = `${INDEX_START}\n${links}\n${INDEX_END}`;
  const original = current ?? `---\ntipoNota: ESTRUTURA\ngrafo: ${graph.manifest.id}\n---\n\n# ${graphTitle}\n`;
  const start = original.indexOf(INDEX_START);
  const end = original.indexOf(INDEX_END);
  if (start !== -1 && end >= start) return original.slice(0, start) + block + original.slice(end + INDEX_END.length);
  return original.trimEnd() + `\n\n${block}\n`;
}

function indexWrites(graph, members) {
  const index = paraPath(graph.root, `Projects/neuralabs-graph-${graph.manifest.id}.md`);
  const current = readOptional(index);
  return [
    { target: graph.filename, expected: graph.raw, next: JSON.stringify(members, null, 2) + "\n" },
    { target: index, expected: current, next: graphIndex(graph, members, current) },
  ];
}

function noteWrite(graph, relative, markdown) {
  if (!paraPath(graph.root, relative)) throw new Error("Invalid note path. Expected a Markdown file inside PARA.");
  const { id, label, fields, canonical } = splitGraphNote(markdown);
  if (id.startsWith("neuralabs-graph-")) throw new Error("Reserved vault note ID.");
  const folder = relative.split(/[/\\]/)[0];
  const { target, content } = canonicalNote(graph, id, folder);
  if (content !== null && splitMarkdown(content).id !== id) throw new Error("Canonical Markdown ID has changed.");
  return { id, label, fields, folder: path.basename(path.dirname(target)), target, expected: content, next: canonical };
}

function mergeWrites(writes) {
  const byPath = new Map();
  for (const write of writes) {
    const previous = byPath.get(write.target);
    if (previous && (previous.next !== write.next || previous.expected !== write.expected)) {
      throw new Error("Há alterações diferentes para o mesmo arquivo compartilhado no vault.");
    }
    byPath.set(write.target, write);
  }
  return [...byPath.values()];
}

function commitVaultWrites(writes) {
  const planned = mergeWrites(writes);
  if (planned.some(({ target, expected }) => readOptional(target) !== expected)) return false;
  const changes = planned.filter(({ expected, next }) => expected !== next);
  const committed = [];
  try {
    for (const write of changes) {
      if (readOptional(write.target) !== write.expected) throw new Error("Vault file changed during the write.");
      fs.mkdirSync(path.dirname(write.target), { recursive: true });
      replaceVaultFile(write.target, write.next);
      committed.push(write);
    }
    return true;
  } catch (error) {
    const unrecovered = [];
    for (const write of committed.reverse()) {
      try {
        if (readOptional(write.target) !== write.next) throw new Error("Vault file changed during rollback.");
        if (write.expected === null) fs.unlinkSync(write.target);
        else replaceVaultFile(write.target, write.expected);
      } catch (failure) { unrecovered.push(failure); }
    }
    if (unrecovered.length) throw new AggregateError([error, ...unrecovered], "Some vault writes could not be restored.");
    throw error;
  }
}

function planSharedGraphFiles(graph, files, { editIds = new Set() } = {}) {
  const members = new Map(graph.members.map((member) => [member.id, member]));
  const writes = [];
  for (const file of files) {
    if (file.relPath === MANIFEST || file.relPath === "AGENTS.md") {
      const target = path.join(file.relPath === MANIFEST ? graph.dir : graph.root, file.relPath);
      const existing = readOptional(target);
      if (file.relPath === MANIFEST || existing === null) writes.push({ target, expected: existing, next: file.content });
      continue;
    }
    const write = noteWrite(graph, file.relPath, file.content);
    if (write.expected !== null && write.expected !== write.next && !file.preserveSharedContent && !editIds.has(write.id)) {
      throw new Error(`O Markdown compartilhado ${write.id} tem conteúdo diferente. Resolva a divergência antes de sincronizar.`);
    }
    members.set(write.id, { id: write.id, label: write.label, folder: write.folder, fields: write.fields });
    writes.push(file.preserveSharedContent && write.expected !== null ? { ...write, next: write.expected } : write);
  }
  return [...writes, ...indexWrites(graph, [...members.values()])];
}

function ensureSharedPara(root) {
  for (const folder of PARA) fs.mkdirSync(path.dirname(paraPath(root, `${folder}/placeholder.md`)), { recursive: true });
}

function writeSharedGraphFiles(graph, files) {
  const writes = planSharedGraphFiles(graph, files);
  ensureSharedPara(graph.root);
  if (!commitVaultWrites(writes)) {
    throw new Error("Os arquivos do vault mudaram durante a gravação.");
  }
  return { written: files.length };
}

function planSharedReplacement(graph, updates) {
  const current = new Map(readSharedGraphFiles(graph).map((file) => [file.relPath, file.content]));
  const members = new Map(graph.members.map((member) => [member.id, member]));
  const writes = [];
  for (const update of updates) {
    if (current.get(update.relPath) !== update.expected) return null;
    const write = noteWrite(graph, update.relPath, update.next);
    if (!members.has(write.id) || !update.relPath.endsWith(`/${write.id}.md`)) return null;
    members.set(write.id, { id: write.id, label: write.label, folder: write.folder, fields: write.fields });
    if (update.expected !== update.next) writes.push(write);
  }
  return [...writes, ...indexWrites(graph, [...members.values()])];
}

function unlinkSharedNotes(graph, relPaths) {
  const available = new Map(graph.members.map((member) => [`${member.folder}/${member.id}.md`, member]));
  const deleted = [...new Set(relPaths.filter((relative) => available.has(relative)))];
  const members = graph.members.filter((member) => !deleted.includes(`${member.folder}/${member.id}.md`));
  if (deleted.length && !commitVaultWrites(indexWrites(graph, members))) {
    throw new Error("O grafo mudou durante a desvinculação.");
  }
  return { deleted, skipped: relPaths.filter((relative) => !available.has(relative)) };
}

module.exports = {
  readSharedManifest, sharedGraph, readSharedGraphFiles, writeSharedGraphFiles, planSharedReplacement,
  unlinkSharedNotes, commitVaultWrites,
  splitGraphNote, projectGraphNote, planSharedGraphFiles, ensureSharedPara,
};
