// Validates and normalizes the generic import JSON (nodes + edges) — parity with the
// server-side import. Pure domain logic: no React, no HTTP. Reused by ImportJsonModal.
import type {
  ImportGraphNode,
  ImportGraphEdge,
  ImportGraphPayload,
} from "../types/graph-import.types";
import { isRelationAllowed, getAllowedRelations } from "./relation-rules";

const NODE_TIPOS = ["ASSUNTO", "TOPICO", "CONCEITO", "FLASHCARD", "NOTA", "TEXTO_BRUTO", "BARALHO"] as const;
const NOTA_TIPOS = ["LITERATURA", "PERMANENTE", "ESTRUTURA"];
const NOTA_SUBTIPOS = ["DEFINICAO", "EXPLICACAO", "EXEMPLO", "COMPARACAO", "SINTESE", "PREREQUISITO", "ERRO_COMUM", "APLICACAO"];

const LIMITS = {
  raw: 8_000_000,
  nodes: 2000,
  edges: 5000,
  titulo: 500,
  nome: 500,
  conteudo: 50_000,
  texto: 200_000,
  descricao: 5_000,
  pergunta: 10_000,
  resposta: 10_000,
  fonte: 1_000,
};

function readStr(v: unknown, field: string, max: number, ctx: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new Error(`"${field}" excede ${max} caracteres${ctx}.`);
  return s;
}

// deriva um título a partir do conteúdo (primeira linha, sem marcação Markdown)
function deriveTitulo(conteudo: string): string {
  const line = conteudo.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  const clean = line.replace(/^#{1,6}\s*/, "").replace(/[*_`]/g, "").trim();
  return clean ? clean.slice(0, 120) : "Sem título";
}

function fillEstrutural(node: ImportGraphNode, o: Record<string, unknown>, pos: string): void {
  node.nome = readStr(o.nome, "nome", LIMITS.nome, pos);
  if (!node.nome) throw new Error(`"nome" é obrigatório${pos}.`);
  node.descricao = readStr(o.descricao, "descricao", LIMITS.descricao, pos) || null;
}

function fillFlashcard(node: ImportGraphNode, o: Record<string, unknown>, pos: string): void {
  node.pergunta = readStr(o.pergunta, "pergunta", LIMITS.pergunta, pos);
  node.resposta = readStr(o.resposta, "resposta", LIMITS.resposta, pos);
  if (!node.pergunta || !node.resposta) throw new Error(`Flashcard exige "pergunta" e "resposta"${pos}.`);
}

function fillNota(node: ImportGraphNode, o: Record<string, unknown>, pos: string): void {
  node.conteudo = readStr(o.conteudo, "conteudo", LIMITS.conteudo, pos);
  if (!node.conteudo) throw new Error(`Nota exige "conteudo"${pos}.`);
  node.titulo = readStr(o.titulo, "titulo", LIMITS.titulo, pos) || deriveTitulo(node.conteudo);
  node.tipoNota = typeof o.tipoNota === "string" ? o.tipoNota : "PERMANENTE";
  if (!NOTA_TIPOS.includes(node.tipoNota)) throw new Error(`"tipoNota" inválido${pos}. Use: ${NOTA_TIPOS.join(", ")}.`);
  node.subtipo = typeof o.subtipo === "string" ? o.subtipo : "";
  if (!NOTA_SUBTIPOS.includes(node.subtipo)) throw new Error(`"subtipo" inválido${pos}. Use: ${NOTA_SUBTIPOS.join(", ")}.`);
  node.fonte = readStr(o.fonte, "fonte", LIMITS.fonte, pos) || null;
  if (node.tipoNota === "LITERATURA" && !node.fonte) throw new Error(`Notas LITERATURA exigem "fonte"${pos}.`);
}

function fillTextoBruto(node: ImportGraphNode, o: Record<string, unknown>, pos: string): void {
  node.titulo = readStr(o.titulo, "titulo", LIMITS.titulo, pos) || "Texto sem título";
  node.texto = readStr(o.texto, "texto", LIMITS.texto, pos);
  if (!node.texto) throw new Error(`Texto bruto exige "texto"${pos}.`);
}

function fillBaralho(node: ImportGraphNode, o: Record<string, unknown>, pos: string): void {
  // aceita "nome" como alias de "titulo"
  node.titulo = readStr(o.titulo ?? o.nome, "titulo", LIMITS.titulo, pos);
  if (!node.titulo) throw new Error(`Baralho exige "titulo"${pos}.`);
}

function applyTipoFields(node: ImportGraphNode, o: Record<string, unknown>, tipo: string, pos: string): void {
  if (tipo === "ASSUNTO" || tipo === "TOPICO" || tipo === "CONCEITO") return fillEstrutural(node, o, pos);
  if (tipo === "FLASHCARD") return fillFlashcard(node, o, pos);
  if (tipo === "NOTA") return fillNota(node, o, pos);
  if (tipo === "TEXTO_BRUTO") return fillTextoBruto(node, o, pos);
  if (tipo === "BARALHO") return fillBaralho(node, o, pos);
}

function parseNode(item: unknown, i: number, refTipo: Map<string, string>): ImportGraphNode {
  const pos = ` (nó #${i + 1})`;
  if (typeof item !== "object" || item === null) throw new Error(`Cada nó deve ser um objeto${pos}.`);
  const o = item as Record<string, unknown>;
  const ref = typeof o.ref === "string" ? o.ref.trim() : "";
  if (!ref) throw new Error(`Cada nó precisa de "ref"${pos}.`);
  if (refTipo.has(ref)) throw new Error(`"ref" duplicado: "${ref}"${pos}.`);
  const tipo = typeof o.tipo === "string" ? o.tipo : "";
  if (!NODE_TIPOS.includes(tipo as (typeof NODE_TIPOS)[number])) {
    throw new Error(`"tipo" inválido (${tipo || "?"})${pos}. Use: ${NODE_TIPOS.join(", ")}.`);
  }
  refTipo.set(ref, tipo);
  const node: ImportGraphNode = { ref, tipo };
  applyTipoFields(node, o, tipo, pos);
  return node;
}

function validateEdgeRefs(origem: string, destino: string, refTipo: Map<string, string>, pos: string): void {
  if (!refTipo.get(origem)) throw new Error(`"origem" desconhecida ("${origem || "?"}")${pos}.`);
  if (!refTipo.get(destino)) throw new Error(`"destino" desconhecido ("${destino || "?"}")${pos}.`);
  if (origem === destino) throw new Error(`Aresta não pode ligar um nó a si mesmo${pos}.`);
}

function validateRelation(origem: string, destino: string, relacao: string, refTipo: Map<string, string>, pos: string): void {
  const to = refTipo.get(origem) ?? "";
  const td = refTipo.get(destino) ?? "";
  if (isRelationAllowed(to, td, relacao)) return;
  const allowed = getAllowedRelations(to, td);
  const hint = allowed.length ? `Permitidas: ${allowed.join(", ")}.` : "Esses tipos não podem se relacionar.";
  throw new Error(`Relação "${relacao || "(vazia)"}" não permitida entre ${to} e ${td}${pos}. ${hint}`);
}

function parsePeso(peso: unknown, pos: string): number | undefined {
  if (peso === undefined || peso === null) return undefined;
  if (typeof peso !== "number" || !Number.isFinite(peso) || peso <= 0 || peso > 2) {
    throw new Error(`"peso" deve ser um número entre 0 e 2${pos}.`);
  }
  return peso;
}

function parseEdge(item: unknown, i: number, refTipo: Map<string, string>): ImportGraphEdge {
  const pos = ` (aresta #${i + 1})`;
  if (typeof item !== "object" || item === null) throw new Error(`Cada aresta deve ser um objeto${pos}.`);
  const o = item as Record<string, unknown>;
  const origem = typeof o.origem === "string" ? o.origem.trim() : "";
  const destino = typeof o.destino === "string" ? o.destino.trim() : "";
  const relacao = typeof o.relacao === "string" ? o.relacao : "";
  validateEdgeRefs(origem, destino, refTipo, pos);
  validateRelation(origem, destino, relacao, refTipo, pos);
  return { origem, destino, relacao, peso: parsePeso(o.peso, pos) };
}

function parseRoot(raw: string): Record<string, unknown> {
  if (raw.length > LIMITS.raw) throw new Error("JSON muito grande. Reduza ou importe em partes.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido — verifique a sintaxe (vírgulas, aspas, chaves).");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error('O JSON deve ser um objeto { "nodes": [...], "edges": [...] }.');
  }
  return parsed as Record<string, unknown>;
}

function validateArrays(rawNodes: unknown, rawEdges: unknown): void {
  if (!Array.isArray(rawNodes)) throw new Error('"nodes" deve ser um array.');
  if (!Array.isArray(rawEdges)) throw new Error('"edges" deve ser um array.');
  if (rawNodes.length === 0) throw new Error('Forneça ao menos um nó em "nodes".');
  if (rawNodes.length > LIMITS.nodes) throw new Error(`Máximo de ${LIMITS.nodes} nós.`);
  if (rawEdges.length > LIMITS.edges) throw new Error(`Máximo de ${LIMITS.edges} arestas.`);
}

/**
 * Parses the generic import JSON into a validated {nodes, edges} payload.
 * @example parseGraphImport('{"nodes":[{"ref":"c1","tipo":"CONCEITO","nome":"HTTP"}],"edges":[]}')
 */
export function parseGraphImport(raw: string): ImportGraphPayload {
  const root = parseRoot(raw);
  const rawEdges = root.edges ?? [];
  validateArrays(root.nodes, rawEdges);
  const refTipo = new Map<string, string>();
  const nodes = (root.nodes as unknown[]).map((item, i) => parseNode(item, i, refTipo));
  const edges = (rawEdges as unknown[]).map((item, i) => parseEdge(item, i, refTipo));
  return { nodes, edges };
}
