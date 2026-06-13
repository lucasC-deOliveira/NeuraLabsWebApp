import yaml from "js-yaml";
import type { TipoRelacao } from "@/lib/graph";

// ---------------------------------------------------------------------------
// Formato do vault Markdown (PARA). Um .md por nó: frontmatter YAML + corpo.
// As arestas de saída do nó ficam no frontmatter como wikilinks [[id]] com
// relação e peso. Compatível com Obsidian/Logseq.
// ---------------------------------------------------------------------------

export type TipoNode =
  | "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA" | "TEXTO_BRUTO" | "BARALHO";

export type ParaFolder = "Projects" | "Areas" | "Resources" | "Archives";

export interface VaultRelacao {
  rel: TipoRelacao;
  alvo: string; // id do nó destino
  peso: number;
}

export interface VaultNode {
  id: string;
  tipo: TipoNode;
  grafoId: string;
  // conteúdo por tipo (preenchido conforme o tipo)
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  // metadados de grafo
  nivelDominio?: number;
  posicaoX?: number | null;
  posicaoY?: number | null;
  criadoEm?: string;
  // arestas de saída
  relacoes: VaultRelacao[];
}

// Mapeamento por papel (PARA):
//   Baralhos → Projects | Assuntos → Areas | resto → Resources
//   (Archives fica reservado para itens arquivados — sem flag por enquanto)
export function paraFolder(tipo: TipoNode): ParaFolder {
  if (tipo === "BARALHO") return "Projects";
  if (tipo === "ASSUNTO") return "Areas";
  return "Resources";
}

export const PARA_FOLDERS: ParaFolder[] = ["Projects", "Areas", "Resources", "Archives"];

/** Label de exibição do nó (espelha o resolveLabel do builder). */
export function vaultNodeLabel(n: VaultNode): string {
  const trunc = (s: string) => (s.length > 60 ? `${s.slice(0, 60)}…` : s);
  switch (n.tipo) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      return n.nome ?? n.id;
    case "FLASHCARD":
      return n.pergunta ? trunc(n.pergunta) : n.id;
    case "NOTA":
      return n.titulo && n.titulo !== "Sem título" ? n.titulo : trunc(n.conteudo ?? n.id);
    case "TEXTO_BRUTO":
      return n.titulo && n.titulo !== "Texto sem título" ? n.titulo : trunc(n.texto ?? n.id);
    case "BARALHO":
      return n.titulo ?? n.nome ?? n.id;
    default:
      return n.id;
  }
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "no"
  );
}

/** Caminho relativo do arquivo do nó dentro do vault. */
export function nodeRelPath(n: VaultNode): string {
  return `${paraFolder(n.tipo)}/${slugify(vaultNodeLabel(n))}--${n.id}.md`;
}

// ---- Serialização ----

function nodeBody(n: VaultNode): string {
  switch (n.tipo) {
    case "FLASHCARD":
      return `## Pergunta\n\n${n.pergunta ?? ""}\n\n## Resposta\n\n${n.resposta ?? ""}\n`;
    case "NOTA":
      return `${n.conteudo ?? ""}\n`;
    case "TEXTO_BRUTO":
      return `${n.texto ?? ""}\n`;
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      return n.descricao ? `${n.descricao}\n` : "";
    default:
      return "";
  }
}

export function serializeNode(n: VaultNode): string {
  const fm: Record<string, unknown> = {
    id: n.id,
    tipo: n.tipo,
    grafo: n.grafoId,
    titulo: vaultNodeLabel(n),
  };
  if (n.tipoNota) fm.tipoNota = n.tipoNota;
  if (n.subtipo) fm.subtipo = n.subtipo;
  if (n.fonte) fm.fonte = n.fonte;
  if (typeof n.nivelDominio === "number") fm.nivelDominio = n.nivelDominio;
  if (n.posicaoX != null || n.posicaoY != null) {
    fm.posicao = { x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 };
  }
  if (n.criadoEm) fm.criadoEm = n.criadoEm;
  if (n.relacoes.length > 0) {
    fm.relacoes = n.relacoes.map((r) => ({ rel: r.rel, alvo: `[[${r.alvo}]]`, peso: r.peso }));
  }

  const front = yaml.dump(fm, { lineWidth: -1, quotingType: '"' }).trimEnd();
  return `---\n${front}\n---\n\n${nodeBody(n)}`;
}

// ---- Parse ----

const WIKILINK = /^\[\[(.+)\]\]$/;
function stripWikilink(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(WIKILINK);
  return m ? m[1].trim() : s;
}

/** Separa o frontmatter YAML do corpo Markdown. */
function splitFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = (yaml.load(m[1]) as Record<string, unknown>) ?? {};
  return { fm, body: m[2].replace(/^\n+/, "") };
}

function parseFlashcardBody(body: string): { pergunta: string; resposta: string } {
  const parts = body.split(/^##\s+Resposta\s*$/m);
  const perguntaPart = parts[0].replace(/^##\s+Pergunta\s*$/m, "").trim();
  const resposta = (parts[1] ?? "").trim();
  return { pergunta: perguntaPart, resposta };
}

export function parseNode(raw: string): VaultNode | null {
  const { fm, body } = splitFrontmatter(raw);
  const id = typeof fm.id === "string" ? fm.id : "";
  const tipo = fm.tipo as TipoNode;
  if (!id || !tipo) return null;

  const relacoesRaw = Array.isArray(fm.relacoes) ? (fm.relacoes as Array<Record<string, unknown>>) : [];
  const relacoes: VaultRelacao[] = relacoesRaw
    .map((r) => ({
      rel: String(r.rel) as TipoRelacao,
      alvo: stripWikilink(r.alvo),
      peso: typeof r.peso === "number" ? r.peso : Number(r.peso) || 1,
    }))
    .filter((r) => r.rel && r.alvo);

  const pos = fm.posicao as { x?: number; y?: number } | undefined;
  const node: VaultNode = {
    id,
    tipo,
    grafoId: typeof fm.grafo === "string" ? fm.grafo : "",
    nivelDominio: typeof fm.nivelDominio === "number" ? fm.nivelDominio : undefined,
    posicaoX: pos?.x ?? null,
    posicaoY: pos?.y ?? null,
    criadoEm: typeof fm.criadoEm === "string" ? fm.criadoEm : undefined,
    tipoNota: typeof fm.tipoNota === "string" ? fm.tipoNota : undefined,
    subtipo: typeof fm.subtipo === "string" ? fm.subtipo : undefined,
    fonte: typeof fm.fonte === "string" ? fm.fonte : null,
    relacoes,
  };

  const titulo = typeof fm.titulo === "string" ? fm.titulo : "";
  switch (tipo) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      node.nome = titulo;
      node.descricao = body.trim() || null;
      break;
    case "FLASHCARD": {
      const { pergunta, resposta } = parseFlashcardBody(body);
      node.pergunta = pergunta;
      node.resposta = resposta;
      break;
    }
    case "NOTA":
      node.titulo = titulo;
      node.conteudo = body.trim();
      break;
    case "TEXTO_BRUTO":
      node.titulo = titulo;
      node.texto = body.trim();
      break;
    case "BARALHO":
      node.titulo = titulo;
      break;
  }
  return node;
}
