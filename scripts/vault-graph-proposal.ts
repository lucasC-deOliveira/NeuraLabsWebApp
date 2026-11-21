import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { vaultGraphProposal, type VaultGraphProposal } from "../contracts/vault-graph-proposal";
import { getCanonicalDirection, isRelationAllowed } from "../src/modules/graph/domain/services/relation-rules";
import { PARA_FOLDERS, nodeRelPath, parseNode, replaceVaultNodeContent, replaceVaultRelations, serializeNode, vaultNodeLabel, type VaultNode } from "../src/lib/vault-format";
import { listVaultGraphFolders } from "../electron/vault-graph-folders.js";
import {
  commitVaultWrites, planSharedGraphFiles, readSharedGraphFiles, sharedGraph,
} from "../electron/vault-shared-para.js";

type GraphFolder = ReturnType<typeof listVaultGraphFolders>[number];
type SharedGraph = NonNullable<ReturnType<typeof sharedGraph>>;
type GraphNote = { node: VaultNode; original?: { relPath: string; content: string }; edited?: boolean; attached?: boolean };
type ProposedFile = { relPath: string; content: string; preserveSharedContent?: boolean };

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readGraph(root: string, folder: GraphFolder): { graph: SharedGraph; notes: Map<string, GraphNote>; revision: string } {
  const graph = sharedGraph(root, folder.directory);
  if (!graph) throw new Error("O grafo precisa estar no PARA compartilhado.");
  const files: Array<{ relPath: string; content: string }> = readSharedGraphFiles(graph);
  files.sort((a, b) => a.relPath.localeCompare(b.relPath));
  const notes = new Map<string, GraphNote>();
  for (const original of files) {
    const node = parseNode(original.content);
    if (!node || notes.has(node.id)) throw new Error(`Markdown inválido ou duplicado: ${original.relPath}`);
    notes.set(node.id, { node, original });
  }
  return { graph, notes, revision: hash([graph.manifest, graph.raw, files]) };
}

function requiredFolder(folders: GraphFolder[], id: string): GraphFolder {
  const folder = folders.find((entry) => entry.id === id);
  if (!folder) throw new Error(`Grafo ${id} não encontrado no vault.`);
  return folder;
}

function noteInfo(node: VaultNode) {
  return { id: node.id, type: node.tipo, title: vaultNodeLabel(node), relations: node.relacoes };
}

export function inspectProposalGraph(root: string, graphId: string, query = "") {
  const folder = requiredFolder(listVaultGraphFolders(root), graphId);
  const { graph, notes, revision } = readGraph(root, folder);
  const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const term = normalize(query);
  const entries = [...notes.values()].filter(({ node }) => !term || normalize(vaultNodeLabel(node)).includes(term));
  return { graphId, name: graph.manifest.name, baseRevision: revision, members: notes.size,
    matches: entries.length, nodes: entries.slice(0, 100).map(({ node }) => noteInfo(node)) };
}

function resolveSource(root: string, source: string): string {
  if (isAbsolute(source) || !PARA_FOLDERS.some((folder) => source.startsWith(folder + "/")) ||
    source.split("/").some((segment) => !segment || segment === "." || segment === "..") || source.includes("\\")) {
    throw new Error(`Fonte inválida: ${source}. Informe um caminho relativo ao PARA.`);
  }
  const file = resolve(root, source);
  const target = realpathSync(file);
  const within = relative(root, target);
  if (!within || within.startsWith(".." + sep) || isAbsolute(within) || target !== file || !lstatSync(target).isFile()) {
    throw new Error(`Fonte fora do acervo: ${source}`);
  }
  return target;
}

function withSources(body: string, proposal: VaultGraphProposal): string {
  const links = proposal.sources.map(({ path, locator }) => `- [[${path}|Fonte]] — ${locator}`);
  return `${body}\n\n## Fontes\n\n${links.join("\n")}`;
}

function existingNotesFor(root: string, folders: GraphFolder[], ids: Set<string>) {
  const related = new Map<string, Array<{ id: string; name: string; note: GraphNote }>>();
  for (const folder of folders) {
    if (!ids.size) break;
    if (folder.layout !== "shared-para") continue;
    const graph = sharedGraph(root, folder.directory);
    if (!graph || !graph.members.some((member: { id: string }) => ids.has(member.id))) continue;
    const snapshot = readGraph(root, folder);
    for (const id of ids) {
      const note = snapshot.notes.get(id);
      if (note) related.set(id, [...(related.get(id) ?? []), { id: folder.id, name: snapshot.graph.manifest.name, note }]);
    }
  }
  return related;
}

function addProposedNotes(root: string, notes: Map<string, GraphNote>, proposal: VaultGraphProposal): void {
  for (const row of proposal.creates) {
    if (notes.has(row.id) || PARA_FOLDERS.some((folder) => existsSync(join(root, folder, `${row.id}.md`)))) {
      throw new Error(`O ID ${row.id} já existe. Reutilize o nó correspondente.`);
    }
    const node: VaultNode = {
      id: row.id, grafoId: proposal.graphId, tipo: row.type, relacoes: [],
      ...(row.type === "NOTA" ? { titulo: row.title, conteudo: withSources(row.body, proposal), tipoNota: row.noteRole ?? "PERMANENTE" }
        : { nome: row.title, descricao: withSources(row.body, proposal) }),
    };
    notes.set(row.id, { node });
  }
}

function editExistingNotes(notes: Map<string, GraphNote>, proposal: VaultGraphProposal): void {
  const edited = new Set<string>();
  for (const edit of proposal.edits) {
    const entry = notes.get(edit.id);
    if (!entry?.original || edited.has(edit.id) || !["NOTA", "CONCEITO"].includes(entry.node.tipo)) {
      throw new Error(`Edição inválida de ${edit.id}. Use uma nota ou conceito existente uma vez.`);
    }
    const { node } = entry;
    const field = node.tipo === "NOTA" ? { title: "titulo", body: "conteudo" } : { title: "nome", body: "descricao" };
    if (edit.title) node[field.title as "titulo" | "nome"] = edit.title;
    if (edit.body) node[field.body as "conteudo" | "descricao"] = withSources(edit.body, proposal);
    entry.edited = true;
    edited.add(edit.id);
  }
}

function addProposedRelations(notes: Map<string, GraphNote>, proposal: VaultGraphProposal) {
  const added: VaultGraphProposal["relations"] = [];
  for (const relation of proposal.relations) {
    const source = notes.get(relation.from);
    const target = notes.get(relation.to);
    if (!source || !target || relation.from === relation.to ||
      !isRelationAllowed(source.node.tipo, target.node.tipo, relation.type)) {
      throw new Error(`Relação inválida: ${relation.from} ${relation.type} ${relation.to}`);
    }
    const direction = getCanonicalDirection(source.node.tipo, target.node.tipo, relation.type);
    if (!direction || direction[0] !== source.node.tipo) throw new Error(`Direção inválida para ${relation.type}.`);
    const existing = source.node.relacoes.find(({ rel, alvo }) => rel === relation.type && alvo === relation.to);
    if (existing && existing.peso !== relation.weight) throw new Error(`A relação ${relation.type} já existe com peso ${existing.peso}.`);
    if (existing) continue;
    source.node.relacoes.push({ rel: relation.type, alvo: relation.to, peso: relation.weight });
    added.push(relation);
  }
  return added;
}

function toProposedFile(entry: GraphNote): ProposedFile {
  const { original, node, edited, attached } = entry;
  if (attached && !edited) return { relPath: nodeRelPath(node), content: serializeNode(node), preserveSharedContent: true };
  if (!original) return { relPath: nodeRelPath(node), content: serializeNode(node) };
  const content = edited ? replaceVaultNodeContent(original.content, node) : original.content;
  return { relPath: original.relPath, content: replaceVaultRelations(content, node.relacoes), preserveSharedContent: !edited };
}

export function planExternalGraph(root: string, raw: unknown) {
  const proposal = vaultGraphProposal.parse(raw);
  const folders = listVaultGraphFolders(root);
  const current = readGraph(root, requiredFolder(folders, proposal.graphId));
  if (proposal.baseRevision !== current.revision) throw new Error("O grafo mudou desde a leitura. Refaça a proposta com a revisão atual.");
  const sourceHashes = proposal.sources.map(({ path }) =>
    createHash("sha256").update(readFileSync(resolveSource(root, path))).digest("hex"));
  const reused = new Set(proposal.reuses.filter((id) => !current.notes.has(id)));
  const edits = new Set(proposal.edits.map(({ id }) => id));
  const related = existingNotesFor(root, folders, new Set([...reused, ...edits]));
  const attachments: string[] = [];
  for (const id of reused) {
    const entry = related.get(id)?.[0]?.note;
    if (!entry) throw new Error(`Nó reutilizável não encontrado: ${id}`);
    current.notes.set(id, { ...entry, attached: true, node: {
      ...entry.node, grafoId: proposal.graphId, relacoes: [], pesoEdital: null, posicaoX: null, posicaoY: null,
    } });
    attachments.push(id);
  }
  addProposedNotes(root, current.notes, proposal);
  editExistingNotes(current.notes, proposal);
  const relations = addProposedRelations(current.notes, proposal);
  const affected = new Set([...proposal.creates.map(({ id }) => id), ...attachments, ...edits, ...relations.map(({ from }) => from)]);
  const files = [...affected].map((id) => toProposedFile(current.notes.get(id)!));
  const writes = planSharedGraphFiles(current.graph, files, { editIds: edits });
  const impact = [...edits].map((id) => ({ id, graphs: (related.get(id) ?? []).map(({ id, name }) => ({ id, name })) }));
  const review = { graphId: proposal.graphId, name: current.graph.manifest.name, summary: proposal.summary,
    sources: proposal.sources, creates: proposal.creates, reuses: [...new Set(proposal.reuses)].map((id) => noteInfo(current.notes.get(id)!.node)),
    attaches: attachments, edits: proposal.edits, impact, relations };
  return { preview: { ...review, confirmation: hash([proposal, review, writes, sourceHashes]) }, writes };
}

export function runGraphProposalCommand(args: string[]): void {
  const [command, vaultPath, argument, confirmation] = args;
  if (!command || !vaultPath || !argument) throw new Error("Uso: inspect <vault> <grafo> [título] | preview <vault> <proposta.json> | apply <vault> <proposta.json> <confirmação>");
  const root = realpathSync(vaultPath);
  if (command === "inspect") { console.log(JSON.stringify(inspectProposalGraph(root, argument, confirmation), null, 2)); return; }
  if (command !== "preview" && command !== "apply") throw new Error(`Comando desconhecido: ${command}`);
  const result = planExternalGraph(root, JSON.parse(readFileSync(argument, "utf8").replace(/^\uFEFF/, "")));
  if (command === "apply") {
    if (!confirmation || confirmation !== result.preview.confirmation) throw new Error("Confirme a revisão exata que saiu no preview.");
    if (!commitVaultWrites(result.writes)) throw new Error("O vault mudou durante a gravação. Gere outro preview.");
  }
  console.log(JSON.stringify({ ...result.preview, applied: command === "apply" }, null, 2));
}
