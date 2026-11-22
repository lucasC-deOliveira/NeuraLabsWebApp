const { vaultGraphLocation, graphsDirectory } = require("./vault-paths");
const path = require("node:path");
const { sharedGraph, readSharedManifest, readSharedGraphFiles, planSharedGraphFiles, ensureSharedPara, commitVaultWrites } = require("./vault-shared-para");
const { readSharedGraphSnapshot } = require("./vault-graph-read");

/** Commits a book graph and its page index together, checking the loaded manifest revision. */
function writeBookGraph(root, { directory, expectedManifest, manifest, notes }) {
  const location = vaultGraphLocation(root, directory);
  const current = location?.central ? readSharedManifest(location.dir) : null;
  if (!location?.central || manifest?.id !== location.id || manifest.layout !== "shared-para" ||
      !manifest.bookSource?.consolidated || !Array.isArray(notes) ||
      (current && current.bookSource?.book !== manifest.bookSource.book)) {
    throw new Error("Invalid book graph write. Expected a central graph for the same book.");
  }
  if (JSON.stringify(current) !== expectedManifest) return false;
  const graph = sharedGraph(location.root, location.dir, current ?? manifest);
  const tracked = new Set(notes.filter(({ previousPath }) => previousPath).map(({ id }) => id));
  const snapshots = new Map(readSharedGraphFiles(graph, null, tracked).map(({ relPath, content }) => [relPath, content]));
  if (notes.some(({ previousPath, expected }) => previousPath && snapshots.get(previousPath) !== expected)) return false;
  const editIds = new Set(notes.filter(({ previousPath }) => previousPath).map(({ id }) => id));
  const files = [{ relPath: ".neuralabs-graph.json", content: JSON.stringify(manifest, null, 2) + "\n" }, ...notes];
  const writes = planSharedGraphFiles(graph, files, { editIds });
  ensureSharedPara(location.root);
  return commitVaultWrites(writes);
}

/** Reads only the graph notes with evidence on the requested physical page. */
async function readBookGraphPage(root, graphId, page) {
  if (!root || typeof graphId !== "string" || !/^book-[a-f0-9]{40}$/u.test(graphId) ||
      !Number.isSafeInteger(page) || page < 1) return { status: "missing" };
  const directory = path.join(graphsDirectory(root), graphId);
  const location = vaultGraphLocation(root, directory);
  if (!location?.central) return { status: "missing" };
  const manifest = readSharedManifest(location.dir);
  if (!manifest?.bookSource?.consolidated || !manifest.bookIndex) return { status: "missing" };
  const index = manifest.bookIndex;
  if (!index.coverage.includes(page)) return { status: "unanalyzed", graphId };
  const ids = new Set(Object.entries(index.nodes).filter(([, pages]) => pages.includes(page)).map(([id]) => id));
  const edges = Object.entries(index.edges).filter(([, pages]) => pages.includes(page)).map(([key]) => key);
  for (const edge of edges) {
    const match = /^\["([^"]+)","[^"]+","([^"]+)"\]$/u.exec(edge);
    if (match) { ids.add(match[1]); ids.add(match[2]); }
  }
  return { status: "ready", graphId, edges, files: await readSharedGraphSnapshot(sharedGraph(root, directory, manifest), { ids }) };
}

module.exports = { writeBookGraph, readBookGraphPage };
