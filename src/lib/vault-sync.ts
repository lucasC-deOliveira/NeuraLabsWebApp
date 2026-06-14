// Sincronização vault ↔ backend (desktop). Manual: Pull (backend → .md) e
// Push (.md → backend). Usa o formato em vault-format + a ponte de fs (Electron).
import { exportGraph, syncGraphFromVault, type ExportGraphNode } from "./graph-api";
import { desktop, type VaultFile } from "./vault-bridge";
import {
  serializeNode,
  parseNode,
  nodeRelPath,
  slugify,
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

  return syncGraphFromVault(grafoId, { nodes, edges });
}

// ---- mapeamentos ----
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

function fromVaultNode(vn: VaultNode): ExportGraphNode {
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
