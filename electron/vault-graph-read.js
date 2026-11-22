const fs = require("node:fs/promises");
const path = require("node:path");
const { projectGraphNote, splitGraphNote } = require("./vault-shared-para");

const PARA = ["Projects", "Areas", "Resources", "Archives"];
const BATCH_SIZE = 24;
const filenameKey = (name) => process.platform === "win32" ? name.toLowerCase() : name;

async function listEntries(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function paraInventory(root, folder) {
  const directory = path.join(root, folder);
  try {
    const [info, resolved] = await Promise.all([fs.lstat(directory), fs.realpath(directory)]);
    if (!info.isDirectory() || resolved !== directory) throw new Error("Invalid PARA directory. Expected a folder inside the selected vault.");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const entries = await listEntries(directory);
  return entries.map(({ name }) => [filenameKey(name), path.join(directory, name)]);
}

async function canonicalGraphInventory(root) {
  const canonical = await fs.realpath(root);
  const files = await Promise.all(PARA.map((folder) => paraInventory(canonical, folder)));
  const inventory = new Map();
  for (const [key, target] of files.flat()) {
    const locations = inventory.get(key) ?? [];
    locations.push(target);
    inventory.set(key, locations);
  }
  return inventory;
}

async function readGraphMember(graph, member, inventory, since, membershipTime) {
  const targets = inventory.get(filenameKey(`${member.id}.md`)) ?? [];
  if (targets.length !== 1) {
    throw new Error(`Expected one Markdown for graph member "${member.id}", found ${targets.length}.`);
  }
  const [target] = targets;
  const info = await fs.lstat(target);
  if (!info.isFile()) throw new Error(`Expected a regular vault file: ${target}`);
  if (since !== null && Math.max(info.mtimeMs, membershipTime) <= since) return null;
  const content = await fs.readFile(target, "utf8");
  if (splitGraphNote(content).id !== member.id) throw new Error(`Unexpected ID in Markdown "${member.id}".`);
  return { relPath: `${member.folder}/${member.id}.md`, content: projectGraphNote(content, graph.manifest.id, member.fields) };
}

/** Reads the graph asynchronously, indexing the flat PARA folders once per snapshot. */
async function readSharedGraphSnapshot(graph, { ids = null, since = null } = {}) {
  const members = ids ? graph.members.filter(({ id }) => ids.has(id)) : graph.members;
  if (!members.length) return [];
  const inventory = await canonicalGraphInventory(graph.root);
  const membershipTime = since === null || graph.raw === null ? 0 : (await fs.stat(graph.filename)).mtimeMs;
  const files = [];
  for (let start = 0; start < members.length; start += BATCH_SIZE) {
    const batch = members.slice(start, start + BATCH_SIZE);
    const read = await Promise.all(batch.map((member) => readGraphMember(graph, member, inventory, since, membershipTime)));
    files.push(...read.filter(Boolean));
  }
  return files;
}

/** Reads legacy PARA folders without blocking Electron during file I/O. */
async function readLegacyGraphSnapshot(root, skipInaccessible = false) {
  const files = [];
  async function walk(directory) {
    const entries = await listEntries(directory).catch(() => []);
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) { await walk(target); continue; }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      try {
        files.push({ relPath: path.relative(root, target), content: await fs.readFile(target, "utf8") });
      } catch (error) {
        if (!skipInaccessible) throw error;
      }
    }
  }
  for (const folder of PARA) await walk(path.join(root, folder));
  return files;
}

module.exports = { readSharedGraphSnapshot, readLegacyGraphSnapshot };
