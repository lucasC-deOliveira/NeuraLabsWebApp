const fs = require("node:fs");
const path = require("node:path");

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
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const name = /^(.+)--([a-zA-Z0-9][a-zA-Z0-9_-]*)$/.exec(entry.name);
    if (!name) return [];
    const directory = path.join(root, entry.name);
    try {
      if (!isGraphFolder(directory)) return [];
      return [{ id: name[2], label: name[1], directory, modifiedAt: fs.statSync(directory).mtime.toISOString() }];
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EACCES") return [];
      throw error;
    }
  });
}

module.exports = { listVaultGraphFolders };
