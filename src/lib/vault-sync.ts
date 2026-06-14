// Sincronização vault ↔ backend (desktop). Manual: Pull (backend → .md) e
// Push (.md → backend). Usa o formato em vault-format + a ponte de fs (Electron).
import { exportGraph, syncGraphFromVault, type ExportGraphNode, type GraphNodeType, type GraphEdgeType } from "./graph-api";
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
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "./vault-guide";

// Retorna a subpasta do vault exclusiva deste grafo: <base>/<slug>--<id>
export function graphVaultDir(baseDir: string, grafoId: string, grafoNome: string): string {
  return `${baseDir}/${slugify(grafoNome)}--${grafoId}`;
}

// Pull: baixa o grafo do backend e grava os .md na subpasta do grafo.
export async function pullVault(grafoId: string, dir: string, grafoNome: string): Promise<{ files: number }> {
  const graphDir = graphVaultDir(dir, grafoId, grafoNome);
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
  files.push({ relPath: VAULT_GUIDE_FILENAME, content: buildVaultGuide() });

  await desktop.vault.write(graphDir, files);
  try { await desktop.vault.writeSyncState(graphDir, { lastPull: new Date().toISOString() }); } catch { /* opcional */ }
  return { files: files.length };
}

// Push: lê os .md da subpasta do grafo e envia ao backend.
export async function pushVault(grafoId: string, grafoNome: string): Promise<{ created: number; updated: number; edges: number; removed: number }> {
  const baseDir = await desktop.vault.getPath();
  if (!baseDir) throw new Error("Pasta do vault não configurada.");
  const graphDir = graphVaultDir(baseDir, grafoId, grafoNome);
  const files = await desktop.vault.read(graphDir);

  const nodes: ExportGraphNode[] = [];
  const edges: { origem: string; destino: string; relacao: string; peso?: number }[] = [];

  for (const f of files) {
    if (f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME)) continue;
    const vn = parseNode(f.content);
    if (!vn) continue;
    nodes.push(fromVaultNode(vn));
    for (const r of vn.relacoes) edges.push({ origem: vn.id, destino: r.alvo, relacao: r.rel, peso: r.peso });
  }

  const result = await syncGraphFromVault(grafoId, { nodes, edges });
  try { await desktop.vault.writeSyncState(graphDir, { lastPush: new Date().toISOString() }); } catch { /* opcional */ }
  return result;
}

// Compara estado atual do backend com o vault para detectar divergências.
export interface SyncDiff {
  backendOnly: number;  // nós que existem só no backend
  vaultOnly: number;    // nós que existem só no vault
  different: number;    // nós em ambos com conteúdo diferente
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
    return { backendOnly, vaultOnly: 0, different: 0, inSync: backendOnly === 0, vaultEmpty: true };
  }

  const vaultNodes = mdFiles.map((f) => parseNode(f.content)).filter(Boolean) as VaultNode[];
  const backendById = new Map(backendPayload.nodes.map((n) => [n.ref, n]));
  const vaultById = new Map(vaultNodes.map((n) => [n.id, n]));

  const backendOnly = backendPayload.nodes.filter((n) => !vaultById.has(n.ref)).length;
  const vaultOnly = vaultNodes.filter((n) => !backendById.has(n.id)).length;

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
    inSync: backendOnly === 0 && vaultOnly === 0 && different === 0,
    vaultEmpty: false,
  };
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
  for (const vn of vaultNodes) {
    for (const r of vn.relacoes) {
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
    nivelDominio: n.nivelDominio,
    posicaoX: n.posicaoX ?? null,
    posicaoY: n.posicaoY ?? null,
    relacoes,
  };
}
