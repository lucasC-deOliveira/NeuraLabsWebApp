const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { createHash } = require("node:crypto");
const { listVaultGraphFolders } = require("../electron/vault-graph-folders");
const {
  splitGraphNote, projectGraphNote, sharedGraph, planSharedGraphFiles, ensureSharedPara, commitVaultWrites,
} = require("../electron/vault-shared-para");

const PARA = ["Projects", "Areas", "Resources", "Archives"];
const MANIFEST = ".neuralabs-graph.json";
const GUIDES = new Set(["AGENTS.md", "CLAUDE.md"]);

function regularFile(filename) {
  if (!fs.existsSync(filename)) return false;
  if (!fs.lstatSync(filename).isFile()) throw new Error(`Expected a regular file: ${filename}`);
  return true;
}

function listContents(directory, prefix = "") {
  if (!fs.existsSync(directory)) return [];
  if (!fs.lstatSync(directory).isDirectory()) throw new Error(`Expected a regular directory: ${directory}`);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    const relative = prefix + entry.name;
    if (entry.isDirectory()) return listContents(file, relative + "/");
    if (!entry.isFile()) throw new Error(`Unsupported vault entry: ${file}`);
    return [{ file, relative }];
  });
}

function parseVaultHeader(markdown) {
  const header = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  return header ? yaml.load(header[1]) : null;
}

function readLegacyGraph(folder) {
  const manifestFile = path.join(folder.directory, MANIFEST);
  const previous = regularFile(manifestFile) ? fs.readFileSync(manifestFile, "utf8") : null;
  const legacy = previous === null ? {} : JSON.parse(previous);
  if (legacy.id && legacy.id !== folder.id) throw new Error(`Graph manifest ID differs: ${folder.directory}`);
  const manifest = { ...legacy, version: 1, id: folder.id, name: legacy.name ?? folder.label, layout: "shared-para" };
  const entries = PARA.flatMap((section) => listContents(path.join(folder.directory, section), `${section}/`));
  const notes = [];
  const attachments = [];
  for (const entry of entries) {
    if (GUIDES.has(path.basename(entry.file))) continue;
    const markdown = path.extname(entry.file).toLowerCase() === ".md" ? fs.readFileSync(entry.file, "utf8") : null;
    const metadata = markdown === null ? null : parseVaultHeader(markdown);
    if (!metadata?.id || !metadata?.tipo) { attachments.push(entry); continue; }
    if (metadata.grafo && metadata.grafo !== folder.id) throw new Error(`Unexpected graph ID in ${entry.file}`);
    notes.push({ ...entry, ...splitGraphNote(markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")), type: metadata.tipo });
  }
  return { ...folder, manifest, previous, notes, attachments };
}

function orderedValue(value) {
  if (Array.isArray(value)) return value.map(orderedValue);
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, orderedValue(value[key])]));
}

function noteSignature(markdown) {
  const boundary = markdown.indexOf("\n---\n", 4);
  const content = markdown.slice(boundary + 5).trimEnd();
  return JSON.stringify([orderedValue(parseVaultHeader(markdown)), content]);
}

function rewriteNoteLinks(markdown, links) {
  const boundary = markdown.indexOf("\n---\n", 4) + 5;
  return markdown.slice(0, boundary) + markdown.slice(boundary).replace(/\[\[([^|#\]]+)([^\]]*)\]\]/g,
    (whole, destination, suffix) => {
      const filename = path.posix.basename(destination.replace(/\\/g, "/")).replace(/\.md$/i, "");
      const id = links.get(filename);
      return id ? `[[${id}${suffix}]]` : whole;
    });
}

function existingCanonical(root, id) {
  return PARA.flatMap((section) => {
    const file = path.join(root, section, `${id}.md`);
    return regularFile(file) ? [{ file, canonical: fs.readFileSync(file, "utf8"), section }] : [];
  });
}

function assessNoteCopies(root, graphs) {
  const byId = new Map();
  for (const graph of graphs) {
    for (const note of graph.notes) {
      if (!byId.has(note.id)) byId.set(note.id, []);
      byId.get(note.id).push(note);
    }
  }
  const nameMatches = new Map();
  for (const [id, notes] of byId) {
    for (const note of notes) {
      const name = path.basename(note.file, path.extname(note.file));
      const earlier = nameMatches.has(name) ? nameMatches.get(name) : id;
      nameMatches.set(name, earlier === id ? id : null);
    }
  }
  const resolved = new Map();
  const conflicts = [];
  for (const [id, notes] of byId) {
    const existing = existingCanonical(root, id);
    const candidates = notes.map((note) => ({ ...note, canonical: rewriteNoteLinks(note.canonical, nameMatches),
      section: note.relative.split("/")[0] }));
    const versions = [...existing, ...candidates];
    if (existing.length > 1 || new Set(versions.map(({ canonical }) => noteSignature(canonical))).size > 1) {
      conflicts.push({ id, files: versions.map(({ file }) => path.relative(root, file)) });
      continue;
    }
    resolved.set(id, versions[0]);
  }
  return { resolved, conflicts };
}

function fileHash(file) {
  const digest = createHash("sha256");
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (let read; (read = fs.readSync(fd, buffer)) > 0;) digest.update(buffer.subarray(0, read));
    return digest.digest("hex");
  } finally { fs.closeSync(fd); }
}

function assessAttachments(root, graphs, noteDestinations) {
  const assets = new Map();
  const conflicts = [];
  for (const graph of graphs) {
    for (const entry of graph.attachments) {
      const target = path.join(root, entry.relative);
      const other = assets.get(target)?.file ?? (regularFile(target) ? target : null);
      if (noteDestinations.has(target.toLowerCase()) || (other && fileHash(entry.file) !== fileHash(other))) {
        conflicts.push({ relative: entry.relative, files: [entry.file, other].filter(Boolean).map((file) => path.relative(root, file)) });
      } else if (!other) assets.set(target, entry);
    }
  }
  return { assets, conflicts };
}

function inspectVault(root) {
  const legacy = listVaultGraphFolders(root).filter(({ layout }) => !layout);
  const graphs = [];
  const unreadable = [];
  for (const folder of legacy) {
    try { graphs.push(readLegacyGraph(folder)); }
    catch (error) { unreadable.push({ graph: folder.id, message: error.message }); }
  }
  const { resolved, conflicts } = assessNoteCopies(root, graphs);
  const noteDestinations = new Set([...resolved.entries()].map(([id, note]) =>
    path.join(root, note.section, `${id}.md`).toLowerCase()));
  const { assets, conflicts: attachments } = assessAttachments(root, graphs, noteDestinations);
  return { graphs, resolved, assets, report: {
    graphs: graphs.map(({ id, label, notes, attachments }) => ({ id, label, notes: notes.length, attachments: attachments.length })),
    canonicalNotes: resolved.size, noteConflicts: conflicts, attachmentConflicts: attachments, unreadable,
  } };
}

function verifyVaultPath(root, filename) {
  const resolved = path.resolve(filename);
  const relative = path.relative(root, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path outside selected vault: ${filename}`);
  }
  for (let parent = resolved; parent !== root; parent = path.dirname(parent)) {
    if (fs.existsSync(parent) && fs.realpathSync(parent) !== parent) {
      throw new Error(`Redirected vault path: ${parent}`);
    }
  }
  return resolved;
}

function planMigrationWrites(root, graphs, resolved) {
  return graphs.flatMap((graph) => {
    const target = sharedGraph(root, graph.directory, graph.manifest);
    const contents = graph.notes.map((entry) => {
      const note = resolved.get(entry.id);
      return {
        relPath: `${note.section}/${entry.id}.md`,
        content: projectGraphNote(note.canonical, graph.id, entry.fields),
      };
    });
    contents.push({ relPath: MANIFEST, content: JSON.stringify(graph.manifest, null, 2) + "\n" });
    return planSharedGraphFiles(target, contents);
  });
}

function archiveVaultGraphs(root, graphs, backup, moved) {
  for (const graph of graphs) {
    const targetDir = verifyVaultPath(root, path.join(backup, path.basename(graph.directory)));
    fs.mkdirSync(targetDir);
    if (graph.previous !== null) {
      fs.copyFileSync(path.join(graph.directory, MANIFEST), path.join(targetDir, MANIFEST), fs.constants.COPYFILE_EXCL);
    }
    for (const section of PARA) {
      const source = verifyVaultPath(root, path.join(graph.directory, section));
      if (!fs.existsSync(source)) continue;
      const target = verifyVaultPath(root, path.join(targetDir, section));
      fs.renameSync(source, target);
      moved.push({ source, target });
    }
  }
}

function copySharedAssets(root, assets, copied) {
  for (const [destination, { file }] of assets) {
    const target = verifyVaultPath(root, destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(verifyVaultPath(root, file), target, fs.constants.COPYFILE_EXCL);
    copied.push(target);
  }
}

function confirmMigration(root, graphs) {
  const folders = listVaultGraphFolders(root);
  return graphs.map((graph) => {
    const folder = folders.find(({ id, directory }) => id === graph.id && directory === graph.directory);
    if (folder?.layout !== "shared-para") throw new Error(`Shared graph not discoverable: ${graph.id}`);
    const migrated = sharedGraph(root, graph.directory);
    const noteIds = new Set(graph.notes.map(({ id }) => id));
    if (migrated.members.length !== noteIds.size || migrated.members.some(({ id }) => !noteIds.has(id))) {
      throw new Error(`Membership verification failed for ${graph.id}`);
    }
    return { id: graph.id, members: migrated.members.length };
  });
}

function executeMigration(root, inventory) {
  const { graphs, resolved, assets, report } = inventory;
  if (report.noteConflicts.length || report.attachmentConflicts.length || report.unreadable.length) {
    throw new Error("Migration paused because the inventory has conflicts or unreadable graphs.");
  }
  if (!graphs.length) return { migrated: [], backup: null };
  const writes = planMigrationWrites(root, graphs, resolved);
  const backupRoot = verifyVaultPath(root, path.join(root, ".neuralabs-legacy"));
  fs.mkdirSync(backupRoot, { recursive: true });
  const backup = fs.mkdtempSync(path.join(backupRoot, "para-"));
  const moved = [];
  const copied = [];
  try {
    ensureSharedPara(root);
    copySharedAssets(root, assets, copied);
    archiveVaultGraphs(root, graphs, backup, moved);
    if (!commitVaultWrites(writes)) throw new Error("Vault changed between planning and applying the migration.");
  } catch (error) {
    for (const { source, target } of moved.reverse()) {
      fs.renameSync(verifyVaultPath(root, target), verifyVaultPath(root, source));
    }
    for (const file of copied) fs.unlinkSync(verifyVaultPath(root, file));
    throw error;
  }
  return { migrated: confirmMigration(root, graphs), backup };
}

function applyMigration(root) {
  const lockPath = verifyVaultPath(root, path.join(root, ".neuralabs-para-migration.lock"));
  const lock = fs.openSync(lockPath, "wx");
  try { return executeMigration(root, inspectVault(root)); }
  finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}

if (require.main === module) {
  const vault = fs.realpathSync(process.argv[2]);
  const result = process.argv[3] === "--apply" ? applyMigration(vault) : inspectVault(vault).report;
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

module.exports = { inspectVault, applyMigration };
