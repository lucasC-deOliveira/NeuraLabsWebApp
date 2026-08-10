// Formato do vault Markdown (PARA): um .md por nó (frontmatter YAML + corpo).
// As arestas de saída ficam no frontmatter como wikilinks [[id]] com relação e
// peso. Compatível com Obsidian. Funções puras (usadas no renderer do desktop).
import yaml from "js-yaml";

export type TipoNode =
  | "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA" | "TEXTO_BRUTO" | "BARALHO"
  | "QUESTION" | "PROVA";

export type ParaFolder = "Projects" | "Areas" | "Resources" | "Archives";

export interface VaultRelacao {
  rel: string;
  alvo: string; // id (ref) do nó destino
  peso: number;
}

// Alternativa de uma questão de múltipla escolha. Mesmo formato que o backend
// guarda no Json `alternativas` e que a UI de provas consome.
export interface VaultAlternativa {
  letra: string;
  texto: string;
}

export interface VaultNode {
  id: string;
  tipo: TipoNode;
  grafoId: string;
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
  enunciado?: string;
  alternativas?: VaultAlternativa[];
  gabarito?: string;
  explicacao?: string | null;
  tipoQuestao?: string;
  nivelDominio?: number;
  posicaoX?: number | null;
  posicaoY?: number | null;
  relacoes: VaultRelacao[];
}

export const PARA_FOLDERS: ParaFolder[] = ["Projects", "Areas", "Resources", "Archives"];

// Baralhos e provas → Projects | Assuntos → Areas | resto → Resources.
// A prova acompanha o baralho porque é a mesma coisa estruturalmente: uma coleção
// de itens de estudo, não uma unidade de conhecimento.
export function paraFolder(tipo: TipoNode): ParaFolder {
  if (tipo === "BARALHO" || tipo === "PROVA") return "Projects";
  if (tipo === "ASSUNTO") return "Areas";
  return "Resources";
}

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
    case "PROVA":
      return n.titulo ?? n.nome ?? n.id;
    // A questão não tem título no banco — o rótulo vem do enunciado, como o
    // flashcard tira o dele da pergunta. O enunciado inteiro vive no corpo.
    case "QUESTION":
      return n.enunciado ? trunc(n.enunciado) : n.id;
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

export function nodeRelPath(n: VaultNode): string {
  return `${paraFolder(n.tipo)}/${slugify(vaultNodeLabel(n))}--${n.id}.md`;
}

// ---- Serialização ----

// Corpo da questão: enunciado, alternativas, gabarito e explicação como seções.
// Alternativas e explicação só aparecem quando existem — uma questão de
// verdadeiro/falso não tem lista, e explicação é opcional no banco.
function questionBody(n: VaultNode): string {
  const alternativas = (n.alternativas ?? []).map((a) => `- (${a.letra}) ${a.texto}`).join("\n");
  const secoes = [`## Enunciado\n\n${n.enunciado ?? ""}`];
  if (alternativas) secoes.push(`## Alternativas\n\n${alternativas}`);
  secoes.push(`## Gabarito\n\n${n.gabarito ?? ""}`);
  if (n.explicacao) secoes.push(`## Explicação\n\n${n.explicacao}`);
  return `${secoes.join("\n\n")}\n`;
}

function nodeBody(n: VaultNode): string {
  switch (n.tipo) {
    case "FLASHCARD":
      return `## Pergunta\n\n${n.pergunta ?? ""}\n\n## Resposta\n\n${n.resposta ?? ""}\n`;
    case "QUESTION":
      return questionBody(n);
    case "NOTA":
      return `${n.conteudo ?? ""}\n`;
    case "TEXTO_BRUTO":
      return `${n.texto ?? ""}\n`;
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
    case "PROVA":
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
  // O banco exige o tipo da questão e não tem default; sai no frontmatter para o
  // arquivo poder voltar sem perder essa informação.
  if (n.tipoQuestao) fm.tipoQuestao = n.tipoQuestao;
  if (typeof n.nivelDominio === "number") fm.nivelDominio = n.nivelDominio;
  if (n.posicaoX != null || n.posicaoY != null) fm.posicao = { x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 };
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

function splitFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = (yaml.load(m[1]) as Record<string, unknown>) ?? {};
  return { fm, body: m[2].replace(/^\n+/, "") };
}

function parseFlashcardBody(body: string): { pergunta: string; resposta: string } {
  const parts = body.split(/^##\s+Resposta\s*$/m);
  const pergunta = parts[0].replace(/^##\s+Pergunta\s*$/m, "").trim();
  const resposta = (parts[1] ?? "").trim();
  return { pergunta, resposta };
}

// Chave da seção sem acento e em minúsculas: o arquivo é editado à mão, e
// `## Explicacao` tem de valer tanto quanto `## Explicação`.
function sectionKey(titulo: string): string {
  return titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// Divide o corpo nas seções `## Título`. O texto antes da primeira seção é
// descartado — quem tem seção nomeada não guarda conteúdo solto no topo.
function bodySections(body: string): Map<string, string> {
  const parts = body.split(/^##\s+(.+?)\s*$/m);
  const secoes = new Map<string, string>();
  for (let i = 1; i < parts.length; i += 2) {
    secoes.set(sectionKey(parts[i]), (parts[i + 1] ?? "").trim());
  }
  return secoes;
}

const ALTERNATIVA = /^[-*]\s*\(([^)]+)\)\s*(.*)$/;

function parseAlternativas(raw: string): VaultAlternativa[] {
  const alternativas: VaultAlternativa[] = [];
  for (const linha of raw.split("\n")) {
    const m = linha.match(ALTERNATIVA);
    if (m) alternativas.push({ letra: m[1].trim(), texto: m[2].trim() });
  }
  return alternativas;
}

type QuestionBody = Pick<VaultNode, "enunciado" | "alternativas" | "gabarito" | "explicacao">;

// Sem `## Enunciado`, o corpo inteiro vira enunciado em vez de a questão virar
// vazia: o arquivo é editado à mão e o Push coage em vez de recusar.
function parseQuestionBody(body: string): QuestionBody {
  const secoes = bodySections(body);
  return {
    enunciado: secoes.get("enunciado") ?? body.trim(),
    alternativas: parseAlternativas(secoes.get("alternativas") ?? ""),
    gabarito: secoes.get("gabarito") ?? "",
    explicacao: secoes.get("explicacao") || null,
  };
}

export function parseNode(raw: string): VaultNode | null {
  const { fm, body } = splitFrontmatter(raw);
  const id = typeof fm.id === "string" ? fm.id : "";
  const tipo = fm.tipo as TipoNode;
  if (!id || !tipo) return null;

  const relacoesRaw = Array.isArray(fm.relacoes) ? (fm.relacoes as Array<Record<string, unknown>>) : [];
  const relacoes: VaultRelacao[] = relacoesRaw
    .map((r) => ({ rel: String(r.rel), alvo: stripWikilink(r.alvo), peso: typeof r.peso === "number" ? r.peso : Number(r.peso) || 1 }))
    .filter((r) => r.rel && r.alvo);

  const pos = fm.posicao as { x?: number; y?: number } | undefined;
  const node: VaultNode = {
    id,
    tipo,
    grafoId: typeof fm.grafo === "string" ? fm.grafo : "",
    nivelDominio: typeof fm.nivelDominio === "number" ? fm.nivelDominio : undefined,
    posicaoX: pos?.x ?? null,
    posicaoY: pos?.y ?? null,
    tipoNota: typeof fm.tipoNota === "string" ? fm.tipoNota : undefined,
    subtipo: typeof fm.subtipo === "string" ? fm.subtipo : undefined,
    fonte: typeof fm.fonte === "string" ? fm.fonte : null,
    tipoQuestao: typeof fm.tipoQuestao === "string" ? fm.tipoQuestao : undefined,
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
    case "PROVA":
      node.titulo = titulo;
      node.descricao = body.trim() || null;
      break;
    case "QUESTION":
      Object.assign(node, parseQuestionBody(body));
      break;
  }
  return node;
}
