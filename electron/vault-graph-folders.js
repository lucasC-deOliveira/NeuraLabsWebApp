const fs = require("node:fs");
const path = require("node:path");
const { readSharedManifest } = require("./vault-shared-para");
const { graphsDirectory, vaultGraphLocation } = require("./vault-paths");

function hasGraphMarkdown(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.some((entry) => {
    if (entry.isDirectory()) return hasGraphMarkdown(path.join(directory, entry.name));
    return entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !["AGENTS.md", "CLAUDE.md"].includes(entry.name);
  });
}

function isGraphFolder(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  if (entries.some((entry) => entry.isFile() && entry.name === ".neuralabs-graph.json")) return true;
  return entries.some((entry) => entry.isDirectory() && ["Projects", "Areas", "Resources", "Archives"].includes(entry.name)
    && hasGraphMarkdown(path.join(directory, entry.name)));
}

/** Discovers exported graphs within the selected vault, independent of their slugs.
 * @example const graphs = listVaultGraphFolders(config.vaultPath)
 */
function listVaultGraphFolders(selectedFolder) {
  if (!selectedFolder) return [];
  const root = path.resolve(selectedFolder);
  const central = listGraphFoldersIn(root, graphsDirectory(root), true);
  const known = new Set(central.map(({ id }) => id));
  return [...central, ...listGraphFoldersIn(root, root, false).filter(({ id }) => !known.has(id))];
}

function listGraphFoldersIn(root, parent, central) {
  try {
    if (!fs.lstatSync(parent).isDirectory()) return [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return fs.readdirSync(parent, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    try {
      const directory = path.join(parent, entry.name);
      const location = vaultGraphLocation(root, directory);
      if (!location || location.central !== central) return [];
      if (!isGraphFolder(directory)) return [];
      const shared = readSharedManifest(directory);
      if (central && shared?.id !== location.id) return [];
      return [{ id: location.id, label: shared?.name ?? location.label, directory, modifiedAt: fs.statSync(directory).mtime.toISOString(),
        ...(shared ? { layout: shared.layout } : {}) }];
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EACCES") return [];
      throw error;
    }
  });
}

module.exports = { listVaultGraphFolders };
