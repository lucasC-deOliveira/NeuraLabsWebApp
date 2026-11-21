const fs = require("node:fs");
const path = require("node:path");

const GRAPH_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const LEGACY_GRAPH = /^(.+)--([a-zA-Z0-9][a-zA-Z0-9_-]*)$/;

function graphsDirectory(root) {
  return path.join(path.resolve(root), ".neuralabs", "graphs");
}

function localStudyDirectory(root) {
  return path.join(path.resolve(root), ".neuralabs", "study");
}

function validateDirectoryChain(root, directory) {
  for (let cursor = directory; cursor !== root; cursor = path.dirname(cursor)) {
    try {
      if (!fs.lstatSync(cursor).isDirectory()) {
        throw new Error(`Invalid vault directory "${cursor}". Expected a regular directory.`);
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

/** Classifies an immediate legacy or central graph directory within this vault.
 * @example const location = vaultGraphLocation(config.vaultPath, directory)
 */
function vaultGraphLocation(selected, directory) {
  if (typeof selected !== "string" || !selected || typeof directory !== "string" || !directory) return null;
  const root = path.resolve(selected);
  const dir = path.resolve(directory);
  const parent = path.dirname(dir);
  const name = path.basename(dir);
  const central = parent === graphsDirectory(root);
  const legacy = parent === root ? LEGACY_GRAPH.exec(name) : null;
  const id = central && GRAPH_ID.test(name) ? name : legacy?.[2];
  if (!id) return null;
  validateDirectoryChain(root, dir);
  return { root, dir, id, central, label: legacy?.[1] ?? id };
}

/** Uses the existing legacy file during transition, with hidden storage for new files.
 * @example const file = vaultStudyFile(root, "_srs.json")
 */
function vaultStudyFile(selected, filename) {
  const root = path.resolve(selected);
  const hidden = localStudyDirectory(root);
  validateDirectoryChain(root, hidden);
  const central = path.join(hidden, filename);
  const legacy = path.join(root, filename);
  if (fs.existsSync(central) || !fs.existsSync(legacy)) return central;
  return legacy;
}

/** Locates an exam archive for a graph, including the compatibility location.
 * @example const directory = examRecordDirectory(location, ".neuralabs-exam-attempts")
 */
function examRecordDirectory(location, folder) {
  const directory = location.central
    ? path.join(localStudyDirectory(location.root), "graphs", location.id, folder)
    : path.join(location.dir, folder);
  validateDirectoryChain(location.root, directory);
  return directory;
}

module.exports = { graphsDirectory, vaultGraphLocation, vaultStudyFile, examRecordDirectory, validateDirectoryChain };
