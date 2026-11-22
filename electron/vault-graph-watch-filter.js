const path = require("node:path");

const paraFolders = new Set(["areas", "archives", "projects", "resources"]);
const normalizePath = (value) => value.replace(/\\/gu, "/").toLowerCase();

/** Builds a membership filter for recursive watcher events in a shared vault. */
function graphWatchFilter(graph, root) {
  if (!graph) return (filename) => {
    if (!filename) return true;
    const parts = normalizePath(filename).split("/");
    return paraFolders.has(parts[0]) && parts.at(-1).endsWith(".md");
  };
  const manifestDir = normalizePath(path.relative(root, graph.dir));
  const members = new Set(graph.members.map(({ id }) => id.toLowerCase()));
  return (filename) => {
    if (!filename) return true;
    const relative = normalizePath(filename);
    if (relative === `${manifestDir}/.neuralabs-members.json` || relative === `${manifestDir}/.neuralabs-graph.json`) return true;
    const [folder, note, ...nested] = relative.split("/");
    return nested.length === 0 && paraFolders.has(folder) && note?.endsWith(".md") && members.has(note.slice(0, -3));
  };
}

module.exports = { graphWatchFilter };
