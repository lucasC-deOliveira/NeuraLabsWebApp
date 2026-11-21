// Sincronização vault ↔ backend (desktop). Manual: Pull (backend → .md) e
// Push (.md → backend). Usa o formato em vault-format + a ponte de fs (Electron).
import { exportGraph, getGrafoInfo, loadGraphVisualState, syncGraphFromVault, type ExportGraphNode, type GraphNodeType, type GraphEdgeType } from "./graph-api";
import { existingVaultGraphDirectory, isSharedVaultGraph, sharedGraphMetadataDir, VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "./vault-graph-manifest";
import { syncVaultSessions } from "./study-api";
import { readSrsLog, writeSrsLog } from "./srs-local";
import { desktop, type VaultFile, type VaultSyncState } from "./vault-bridge";
import {
  serializeNode,
  parseNode,
  nodeRelPath,
  slugify,
  vaultNodeLabel,
  type VaultNode,
  type VaultRelacao,
  type TipoNode,
} from "./vault-format";
import { buildSharedVaultGuide, buildVaultGuide, VAULT_GUIDE_FILENAME } from "./vault-guide";
import { completeVaultGraphPublication, readPendingVaultGraph, registerLocalVaultGraph } from "./vault-graph-publication";
import { guardSharedVaultRelations, parseVaultUploadNodes } from "./vault-relation-conflicts";

export type VaultTransferProgress =
  | { phase: "reading-vault" | "checking-relations" | "registering" | "confirming" | "checking-reviews" | "downloading" }
  | { phase: "sending"; nodes: number; edges: number }
  | { phase: "writing-vault"; files: number };

type ReportVaultProgress = (progress: VaultTransferProgress) => void;

// Retorna a subpasta do vault exclusiva deste grafo: <base>/<slug>--<id>
export function graphVaultDir(baseDir: string, grafoId: string, grafoNome: string): string {
  return `${baseDir}/${slugify(grafoNome)}--${grafoId}`;
}

// Lê todos os nós parseados do vault para um grafo específico.
export async function readAllVaultNodes(grafoId: string, grafoNome: string): Promise<VaultNode[]> {
  try {
    const vaultDir = await desktop.vault.getPath();
    if (!vaultDir) return [];
    const graphDir = await existingVaultGraphDirectory(grafoId) ?? graphVaultDir(vaultDir, grafoId, grafoNome);
    const files = await desktop.vault.read(graphDir);
    return files
      .filter((f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME))
      .map((f) => parseNode(f.content))
      .filter(Boolean) as VaultNode[];
  } catch {
    return [];
  }
}

// Busca um nó específico no vault por ID e tipo.
export async function findVaultNode(
  grafoId: string,
  grafoNome: string,
  nodeId: string,
  tipo?: string,
): Promise<VaultNode | null> {
  const nodes = await readAllVaultNodes(grafoId, grafoNome);
  return nodes.find((n) => n.id === nodeId && (!tipo || n.tipo === tipo)) ?? null;
}

// Pull: baixa o grafo do backend e grava os .md na subpasta do grafo.
export async function pullVault(grafoId: string, dir: string, report?: ReportVaultProgress): Promise<{ files: number }> {
  report?.({ phase: "downloading" });
  const existingDir = await existingVaultGraphDirectory(grafoId);
  const graphDir = existingDir ?? sharedGraphMetadataDir(dir, grafoId);
  const payload = await exportGraph(grafoId);

  // arestas de saída por nó (ref de origem → relações)
  const outByRef = new Map<string, VaultRelacao[]>();
  for (const e of payload.edges) {
    const list = outByRef.get(e.origem) ?? [];
    list.push({ rel: e.relacao, alvo: e.destino, peso: e.peso ?? 1 });
    outByRef.set(e.origem, list);
  }

  const files: VaultFile[] = payload.nodes.map((n) => {
    const vn = toVaultNode(payload.grafo.id, n, outByRef.get(n.ref) ?? []);
    return { relPath: nodeRelPath(vn), content: serializeNode(vn) };
  });
  const shared = !existingDir || await isSharedVaultGraph(existingDir, grafoId);
  files.push({ relPath: VAULT_GUIDE_FILENAME, content: shared ? buildSharedVaultGuide() : buildVaultGuide() });
  const manifest = await buildGraphManifest(grafoId, payload.grafo.nome);
  if (shared) manifest.layout = "shared-para";
  files.push({ relPath: VAULT_GRAPH_MANIFEST, content: JSON.stringify(manifest, null, 2) + "\n" });

  report?.({ phase: "writing-vault", files: files.length });
  await desktop.vault.write(graphDir, files);
  try { await desktop.vault.writeSyncState(graphDir, { lastPull: new Date().toISOString() }); } catch { /* opcional */ }
  return { files: files.length };
}

async function buildGraphManifest(id: string, name: string): Promise<VaultGraphManifest> {
  const [info, visual] = await Promise.allSettled([getGrafoInfo(id), loadGraphVisualState(id)]);
  const meta = info.status === "fulfilled" ? info.value : null;
  const viewport = visual.status === "fulfilled" ? visual.value : null;
  return {
    version: 1, id, name, description: meta?.descricao ?? undefined, parentId: meta?.parentGrafoId,
    parentName: meta?.parentNome, parentRelation: meta?.tipoRelacaoPai,
    childCount: meta?.filhosCount, visual: viewport?.pan && typeof viewport.zoom === "number"
      ? { zoom: viewport.zoom, pan: viewport.pan } : undefined,
  };
}

// Push: lê os .md da subpasta do grafo e envia ao backend.
export async function pushVault(grafoId: string, grafoNome: string, report?: ReportVaultProgress): Promise<{ created: number; updated: number; edges: number; removed: number }> {
  report?.({ phase: "reading-vault" });
  const baseDir = await desktop.vault.getPath();
  if (!baseDir) throw new Error("Pasta do vault não configurada.");
  const graphDir = await existingVaultGraphDirectory(grafoId) ?? graphVaultDir(baseDir, grafoId, grafoNome);
  const localNodes = parseVaultUploadNodes(await desktop.vault.read(graphDir), grafoId);
  report?.({ phase: "checking-relations" });
  await guardSharedVaultRelations(desktop.vault, graphDir, grafoNome, localNodes);

  const nodes = localNodes.map(fromVaultNode);
  const localIds = new Set(localNodes.map(({ id }) => id));
  const edges = localNodes.flatMap((node) => node.relacoes.filter(({ alvo }) => localIds.has(alvo)).map((link) => ({
    origem: node.id, destino: link.alvo, relacao: link.rel, peso: link.peso,
  })));

  const publication = await readPendingVaultGraph(graphDir, grafoId);
  if (publication) {
    report?.({ phase: "registering" });
    await registerLocalVaultGraph(publication);
  }
  report?.({ phase: "sending", nodes: nodes.length, edges: edges.length });
  const result = await syncGraphFromVault(grafoId, {
    nodes, edges, preserveExistingRelations: publication ? true : undefined,
  });
  if (publication) {
    report?.({ phase: "confirming" });
    await completeVaultGraphPublication(graphDir, publication);
  }

  // Envia sessões SRS locais não sincronizadas. O log é da RAIZ do vault (a agenda
  // é do card, não da vista); a pasta do grafo entra só para absorver o log antigo.
  report?.({ phase: "checking-reviews" });
  try {
    const srsLog = await readSrsLog(baseDir, graphDir);
    const unsynced = srsLog.sessions.filter(
      (s) => !s.catalog && !s.syncedAt && !s.revisoes.some((review) => review.serverConfirmed)
        && s.revisoes.length > 0 && s.endedAt !== null,
    );
    if (unsynced.length > 0) {
      const { synced } = await syncVaultSessions(unsynced);
      if (synced > 0) {
        const syncedAt = new Date().toISOString();
        const unsyncedIds = new Set(unsynced.map((s) => s.id));
        for (const s of srsLog.sessions) {
          if (unsyncedIds.has(s.id)) s.syncedAt = syncedAt;
        }
        await writeSrsLog(baseDir, srsLog);
      }
    }
  } catch { /* sync de SRS é não-fatal */ }

  try { await desktop.vault.writeSyncState(graphDir, { lastPush: new Date().toISOString() }); } catch { /* opcional */ }
  return result;
}

// Um .md que descreve um nó que o grafo não tem mais. O caso comum é renomear um
// conceito: o id deriva do título, então muda o id e muda o nome do arquivo — o
// gerador escreve o novo e o antigo FICA, com conteúdo desatualizado.
export interface VaultOrphan {
  id: string;
  titulo: string;
  relPath: string;
}

// Compara estado atual do backend com o vault para detectar divergências.
export interface SyncDiff {
  backendOnly: number;  // nós que existem só no backend
  vaultOnly: number;    // nós que existem só no vault
  different: number;    // nós em ambos com conteúdo diferente
  orphans: VaultOrphan[]; // os `vaultOnly`, identificados (para listar e remover)
  inSync: boolean;
  vaultEmpty: boolean;  // vault não tem nenhum .md ainda
}

export async function compareSyncState(grafoId: string, graphDir: string): Promise<SyncDiff> {
  const [vaultFiles, backendPayload] = await Promise.all([
    desktop.vault.read(graphDir).catch(() => [] as VaultFile[]),
    exportGraph(grafoId),
  ]);

  const mdFiles = vaultFiles.filter(
    (f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME),
  );

  if (mdFiles.length === 0) {
    const backendOnly = backendPayload.nodes.length;
    return {
      backendOnly, vaultOnly: 0, different: 0, orphans: [],
      inSync: backendOnly === 0, vaultEmpty: true,
    };
  }

  // O nó é pareado com o arquivo de onde veio para que o órfão possa ser apagado
  // depois — sem isso sobra a contagem, e o usuário tem de caçar os arquivos na mão.
  const parsed = mdFiles
    .map((f) => ({ node: parseNode(f.content), relPath: f.relPath }))
    .filter((p): p is { node: VaultNode; relPath: string } => p.node !== null);
  const vaultNodes = parsed.map((p) => p.node);
  const backendById = new Map(backendPayload.nodes.map((n) => [n.ref, n]));
  const vaultById = new Map(vaultNodes.map((n) => [n.id, n]));

  const backendOnly = backendPayload.nodes.filter((n) => !vaultById.has(n.ref)).length;
  const orphans: VaultOrphan[] = parsed
    .filter((p) => !backendById.has(p.node.id))
    .map((p) => ({ id: p.node.id, titulo: vaultNodeLabel(p.node), relPath: p.relPath }));
  const vaultOnly = orphans.length;

  let different = 0;
  for (const vn of vaultNodes) {
    const bn = backendById.get(vn.id);
    if (!bn) continue;
    if (
      (vn.nome ?? "") !== (bn.nome ?? "") ||
      (vn.titulo ?? "") !== (bn.titulo ?? "") ||
      (vn.conteudo ?? "") !== (bn.conteudo ?? "") ||
      (vn.pergunta ?? "") !== (bn.pergunta ?? "") ||
      (vn.resposta ?? "") !== (bn.resposta ?? "")
    ) different++;
  }

  return {
    backendOnly,
    vaultOnly,
    different,
    orphans,
    inSync: backendOnly === 0 && vaultOnly === 0 && different === 0,
    vaultEmpty: false,
  };
}

/**
 * Apaga os `.md` órfãos da pasta do grafo. Nunca é chamada sozinha — a UI pede
 * confirmação e lista o que vai sumir. Só toca os caminhos que vieram do
 * `compareSyncState`, e o processo main recusa qualquer coisa que não seja um
 * `.md` dentro da pasta.
 * @example removeOrphans('/vault/bio--g1', [{ id, titulo, relPath }])
 */
export async function removeOrphans(
  graphDir: string,
  orphans: VaultOrphan[],
): Promise<{ deleted: number; skipped: string[] }> {
  if (orphans.length === 0) return { deleted: 0, skipped: [] };
  const { deleted, skipped } = await desktop.vault.deleteFiles(
    graphDir,
    orphans.map((o) => o.relPath),
  );
  return { deleted: deleted.length, skipped };
}

// Lê o estado de sincronização da subpasta do grafo.
export async function getSyncState(graphDir: string): Promise<VaultSyncState | null> {
  try {
    return await desktop.vault.readSyncState(graphDir);
  } catch {
    return null;
  }
}

// Retorna quantos .md foram modificados desde `since` (ISO 8601).
export async function getModifiedCount(graphDir: string, since: string): Promise<number> {
  try {
    const { count } = await desktop.vault.checkModified(graphDir, since);
    return count;
  } catch {
    return 0;
  }
}

// ---- vault → rawNodes/rawEdges (atualização em memória, sem backend) ----

export function vaultToGraphNode(
  vn: VaultNode,
  existing?: Pick<GraphNodeType, "posicaoX" | "posicaoY" | "nivelDominio" | "prioridadeRevisao">,
): GraphNodeType {
  return {
    id: vn.id,
    label: vaultNodeLabel(vn),
    type: vn.tipo,
    nivelDominio: existing?.nivelDominio ?? vn.nivelDominio ?? 0,
    prioridadeRevisao: existing?.prioridadeRevisao ?? 5,
    pergunta: vn.pergunta,
    posicaoX: existing?.posicaoX ?? vn.posicaoX ?? undefined,
    posicaoY: existing?.posicaoY ?? vn.posicaoY ?? undefined,
  };
}

export function vaultToGraphEdges(vaultNodes: VaultNode[]): GraphEdgeType[] {
  const edges: GraphEdgeType[] = [];
  const present = new Set(vaultNodes.map(({ id }) => id));
  for (const vn of vaultNodes) {
    for (const r of vn.relacoes) {
      if (!present.has(r.alvo)) continue;
      edges.push({ source: vn.id, target: r.alvo, type: r.rel, peso: r.peso });
    }
  }
  return edges;
}

// ---- mapeamentos ----
export function fromVaultNode(vn: VaultNode): ExportGraphNode {
  return {
    ref: vn.id,
    tipo: vn.tipo,
    nome: vn.nome,
    descricao: vn.descricao ?? null,
    pergunta: vn.pergunta,
    resposta: vn.resposta,
    titulo: vn.titulo,
    conteudo: vn.conteudo,
    tipoNota: vn.tipoNota,
    subtipo: vn.subtipo,
    fonte: vn.fonte ?? null,
    texto: vn.texto,
    enunciado: vn.enunciado,
    alternativas: vn.alternativas,
    gabarito: vn.gabarito,
    explicacao: vn.explicacao ?? null,
    tipoQuestao: vn.tipoQuestao,
    pesoEdital: vn.pesoEdital ?? null,
    posicaoX: vn.posicaoX ?? null,
    posicaoY: vn.posicaoY ?? null,
    nivelDominio: vn.nivelDominio,
  };
}

function toVaultNode(grafoId: string, n: ExportGraphNode, relacoes: VaultRelacao[]): VaultNode {
  return {
    id: n.ref,
    tipo: n.tipo as TipoNode,
    grafoId,
    nome: n.nome,
    descricao: n.descricao ?? null,
    pergunta: n.pergunta,
    resposta: n.resposta,
    titulo: n.titulo,
    conteudo: n.conteudo,
    tipoNota: n.tipoNota,
    subtipo: n.subtipo,
    fonte: n.fonte ?? null,
    texto: n.texto,
    enunciado: n.enunciado,
    alternativas: n.alternativas,
    gabarito: n.gabarito,
    explicacao: n.explicacao ?? null,
    tipoQuestao: n.tipoQuestao,
    questaoIds: n.questaoIds,
    pesoEdital: n.pesoEdital ?? null,
    nivelDominio: n.nivelDominio,
    posicaoX: n.posicaoX ?? null,
    posicaoY: n.posicaoY ?? null,
    relacoes,
  };
}
