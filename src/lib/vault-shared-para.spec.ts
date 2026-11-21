import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { parseNode, serializeNode } from "./vault-format";
import type { VaultFile, VaultGraphMarkdownWrite } from "./vault-bridge";

interface SharedManifest { id: string; name: string; layout: "shared-para" }
interface SharedGraphHandle { dir: string }
interface VaultWritePlan { target: string; expected: string | null; next: string }

const native = createRequire(import.meta.url)("../../electron/vault-shared-para.js") as {
  sharedGraph(root: string, directory: string, manifest?: SharedManifest): SharedGraphHandle;
  writeSharedGraphFiles(graph: SharedGraphHandle, files: VaultFile[]): { written: number };
  readSharedGraphFiles(graph: SharedGraphHandle): VaultFile[];
  planSharedReplacement(graph: SharedGraphHandle, writes: VaultGraphMarkdownWrite[]): VaultWritePlan[];
  commitVaultWrites(writes: VaultWritePlan[]): boolean;
  unlinkSharedNotes(graph: SharedGraphHandle, paths: string[]): { deleted: string[]; skipped: string[] };
};
const migration = createRequire(import.meta.url)("../../scripts/migrate-vault-para.cjs") as {
  inspectVault(root: string): { report: { canonicalNotes: number; noteConflicts: unknown[] } };
  applyMigration(root: string): { backup: string; migrated: Array<{ id: string; members: number }> };
};
const { listVaultGraphFolders } = createRequire(import.meta.url)("../../electron/vault-graph-folders.js") as {
  listVaultGraphFolders(root: string): Array<{ id: string; directory: string; layout?: string }>;
};
const vaultPaths = createRequire(import.meta.url)("../../electron/vault-paths.js") as {
  vaultGraphLocation(root: string, directory: string): { central: boolean } | null;
  examRecordDirectory(location: { central: boolean }, folder: string): string;
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "neuralabs-shared-para-"));
  roots.push(root);
  return root;
}

function writeGraph(root: string, id: string, notes: VaultFile[]): string {
  const directory = join(root, `graph--${id}`);
  const manifest = { version: 1, id, name: id, layout: "shared-para" as const };
  const graph = native.sharedGraph(root, directory, manifest);
  native.writeSharedGraphFiles(graph, [
    ...notes, { relPath: ".neuralabs-graph.json", content: JSON.stringify(manifest) },
  ]);
  return directory;
}

function note(graphId: string, body = "A single idea. Related to [[other]].", peso = 1): VaultFile {
  return {
    relPath: "Resources/shared-title--note.md",
    content: serializeNode({
      grafoId: graphId, id: "note", tipo: "NOTA", titulo: "Shared title", tipoNota: "PERMANENTE", conteudo: body,
      relacoes: [{ rel: "REFERENCIA", alvo: "other", peso }],
    }),
  };
}

it("stores a single zettel and projects separate relations in two graph views", () => {
  const root = makeRoot();
  const first = writeGraph(root, "g1", [note("g1")]);
  const second = writeGraph(root, "g2", [note("g2", undefined, 1.5)]);
  expect(readdirSync(join(root, "Resources"))).toEqual(["note.md"]);
  expect(existsSync(join(first, "Resources"))).toBe(false);
  expect(readFileSync(join(root, "Projects", "neuralabs-graph-g1.md"), "utf8")).toContain("[[note|Shared title]]");
  expect(parseNode(native.readSharedGraphFiles(native.sharedGraph(root, first))[0].content)?.relacoes[0].peso).toBe(1);
  expect(parseNode(native.readSharedGraphFiles(native.sharedGraph(root, second))[0].content)?.relacoes[0].peso).toBe(1.5);
  const canonical = readFileSync(join(root, "Resources", "note.md"), "utf8");
  expect(canonical).toContain("tipoNota: PERMANENTE");
  expect(canonical).toContain("[[other]]");
  expect(canonical).not.toMatch(/^grafo:|^relacoes:/m);
});

it("discovers both graph layouts and stores new graph study files outside the public PARA", () => {
  const root = makeRoot();
  const legacy = writeGraph(root, "g1", [note("g1")]);
  const central = join(root, ".neuralabs", "graphs", "g2");
  const manifest = { id: "g2", name: "Graph two", layout: "shared-para" as const };
  native.writeSharedGraphFiles(native.sharedGraph(root, central, manifest), [
    note("g2"), { relPath: ".neuralabs-graph.json", content: JSON.stringify(manifest) },
  ]);
  expect(listVaultGraphFolders(root)).toMatchObject([
    { id: "g2", directory: central, layout: "shared-para" },
    { id: "g1", directory: legacy, layout: "shared-para" },
  ]);
  const location = vaultPaths.vaultGraphLocation(root, central)!;
  expect(vaultPaths.examRecordDirectory(location, ".neuralabs-exam-progress")).toBe(
    join(root, ".neuralabs", "study", "graphs", "g2", ".neuralabs-exam-progress"),
  );
  expect(readdirSync(join(root, "Resources"))).toEqual(["note.md"]);
});

it("projects an external edit in both graphs and unlinks one without deleting the Markdown", () => {
  const root = makeRoot();
  const first = writeGraph(root, "g1", [note("g1")]);
  const second = writeGraph(root, "g2", [note("g2")]);
  const canonical = join(root, "Resources", "note.md");
  writeFileSync(canonical, readFileSync(canonical, "utf8").replace("A single idea.", "An edited idea."));
  for (const dir of [first, second]) {
    expect(native.readSharedGraphFiles(native.sharedGraph(root, dir))[0].content).toContain("An edited idea.");
  }
  const firstGraph = native.sharedGraph(root, first);
  expect(native.unlinkSharedNotes(firstGraph, ["Resources/note.md"]).deleted).toEqual(["Resources/note.md"]);
  expect(native.readSharedGraphFiles(native.sharedGraph(root, first))).toEqual([]);
  expect(native.readSharedGraphFiles(native.sharedGraph(root, second))).toHaveLength(1);
  expect(existsSync(canonical)).toBe(true);
});

it("rejects conflicting content before adding the membership of another graph", () => {
  const root = makeRoot();
  writeGraph(root, "g1", [note("g1")]);
  expect(() => writeGraph(root, "g2", [note("g2", "A conflicting version.")])).toThrow("conteúdo diferente");
  expect(existsSync(join(root, "graph--g2", ".neuralabs-members.json"))).toBe(false);
});

it("keeps handwritten index text and rejects stale edits to shared content", () => {
  const root = makeRoot();
  const dir = writeGraph(root, "g1", [note("g1")]);
  const moc = join(root, "Projects", "neuralabs-graph-g1.md");
  writeFileSync(moc, readFileSync(moc, "utf8") + "\nPersonal outline.\n");
  const graph = native.sharedGraph(root, dir);
  const file = native.readSharedGraphFiles(graph)[0];
  const edit = { dir, relPath: file.relPath, expected: file.content, next: file.content.replace("A single idea.", "A new idea.") };
  expect(native.commitVaultWrites(native.planSharedReplacement(graph, [edit]))).toBe(true);
  expect(native.readSharedGraphFiles(native.sharedGraph(root, dir))[0].content).toContain("A new idea.");
  expect(readFileSync(moc, "utf8")).toContain("Personal outline.");
  expect(native.planSharedReplacement(native.sharedGraph(root, dir), [edit])).toBeNull();
});

it("migrates legacy graphs to one canonical note and preserves originals and study records", () => {
  const root = makeRoot();
  const original = "A single idea. Related to [[shared-title--note]].";
  for (const id of ["g1", "g2"]) {
    const folder = join(root, `legacy--${id}`);
    mkdirSync(join(folder, "Resources"), { recursive: true });
    writeFileSync(join(folder, "Resources", "shared-title--note.md"), note(id, original).content);
    writeFileSync(join(folder, "_srs.json"), "study data");
  }
  expect(migration.inspectVault(root).report).toMatchObject({ canonicalNotes: 1, noteConflicts: [] });
  expect(existsSync(join(root, "Resources"))).toBe(false);
  const result = migration.applyMigration(root);
  expect(result.migrated).toHaveLength(2);
  expect(readFileSync(join(root, "Resources", "note.md"), "utf8")).toContain("[[note]]");
  expect(readFileSync(join(root, "legacy--g1", "_srs.json"), "utf8")).toBe("study data");
  expect(readFileSync(join(result.backup, "legacy--g1", "Resources", "shared-title--note.md"), "utf8")).toContain(original);
  expect(migration.inspectVault(root).report.canonicalNotes).toBe(0);
});
