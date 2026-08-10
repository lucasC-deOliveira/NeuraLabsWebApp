// Validação dos .md do vault ANTES do Push. Sem isto, um erro de formato só
// aparece como rejeição do backend (ou, pior, como dado perdido em silêncio: o
// Push descarta aresta inválida sem reclamar).
//
// Reaproveita o parser de vault-format em vez de reimplementar a leitura — as
// duas leituras precisam concordar, senão o validador aprova o que o Push recusa.
import { parseNode, paraFolder, type TipoNode, type VaultNode } from "./vault-format";
import { isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import type { VaultFile } from "./vault-bridge";

// `erro` = o Push vai recusar ou gravar coisa errada. `aviso` = o Push passa,
// mas algo será descartado em silêncio ou o grafo fica pior.
export type VaultIssueSeverity = "erro" | "aviso";

export interface VaultIssue {
  severity: VaultIssueSeverity;
  relPath: string;
  message: string;
}

const PESO_MIN = 0.1;
const PESO_MAX = 2;

interface ParsedFile {
  node: VaultNode;
  relPath: string;
}

function folderOf(relPath: string): string {
  return relPath.replace(/\\/g, "/").split("/")[0] ?? "";
}

// Um `.md` que o parser não entende nunca chega ao backend: vira erro aqui.
function parseAll(files: VaultFile[]): { parsed: ParsedFile[]; issues: VaultIssue[] } {
  const parsed: ParsedFile[] = [];
  const issues: VaultIssue[] = [];
  for (const f of files) {
    const node = parseNode(f.content);
    if (!node) {
      issues.push({
        severity: "erro",
        relPath: f.relPath,
        message: "Frontmatter ilegível ou sem `id`/`tipo`. O nó não será enviado.",
      });
      continue;
    }
    parsed.push({ node, relPath: f.relPath });
  }
  return { parsed, issues };
}

function checkDuplicateIds(parsed: ParsedFile[]): VaultIssue[] {
  const byId = new Map<string, string[]>();
  for (const p of parsed) byId.set(p.node.id, [...(byId.get(p.node.id) ?? []), p.relPath]);
  return [...byId.entries()]
    .filter(([, paths]) => paths.length > 1)
    .flatMap(([id, paths]) =>
      paths.map((relPath) => ({
        severity: "erro" as const,
        relPath,
        message: `id "${id}" repetido em ${paths.length} arquivos. Um sobrescreve o outro no Push.`,
      })),
    );
}

function checkFolder(p: ParsedFile): VaultIssue[] {
  const esperada = paraFolder(p.node.tipo as TipoNode);
  const atual = folderOf(p.relPath);
  if (atual === esperada) return [];
  return [{
    severity: "aviso",
    relPath: p.relPath,
    message: `${p.node.tipo} deveria estar em ${esperada}/, não em ${atual || "(raiz)"}/.`,
  }];
}

function checkBody(p: ParsedFile): VaultIssue[] {
  const { node, relPath } = p;
  if (node.tipo === "FLASHCARD" && (!node.pergunta?.trim() || !node.resposta?.trim())) {
    return [{
      severity: "erro",
      relPath,
      message: "FLASHCARD sem `## Pergunta` e/ou `## Resposta` — o cartão vai vazio.",
    }];
  }
  if (node.tipo === "QUESTION" && (!node.enunciado?.trim() || !node.gabarito?.trim())) {
    return [{
      severity: "erro",
      relPath,
      message: "QUESTION sem `## Enunciado` e/ou `## Gabarito` — a questão vai incompleta.",
    }];
  }
  return [];
}

function checkRelations(p: ParsedFile, tipoById: Map<string, string>): VaultIssue[] {
  const issues: VaultIssue[] = [];
  for (const r of p.node.relacoes) {
    const destino = tipoById.get(r.alvo);
    if (!destino) {
      issues.push({
        severity: "aviso",
        relPath: p.relPath,
        message: `Relação ${r.rel} aponta para [[${r.alvo}]], que não existe no vault. O Push descarta.`,
      });
      continue;
    }
    if (!isRelationAllowed(p.node.tipo, destino, r.rel)) {
      issues.push({
        severity: "aviso",
        relPath: p.relPath,
        message: `${p.node.tipo} → ${destino} não aceita ${r.rel}. O Push descarta essa aresta.`,
      });
      continue;
    }
    if (r.peso < PESO_MIN || r.peso > PESO_MAX) {
      issues.push({
        severity: "aviso",
        relPath: p.relPath,
        message: `peso ${r.peso} fora de ${PESO_MIN}–${PESO_MAX} em ${r.rel}. O Push coage para 1.`,
      });
    }
  }
  return issues;
}

// Conceito que nenhum cartão nem questão testa: existe no grafo mas não há como
// estudá-lo. É a lacuna que o levantamento do ABGF mais encontrou.
function checkUntestedConcepts(parsed: ParsedFile[]): VaultIssue[] {
  const testados = new Set<string>();
  for (const p of parsed) {
    if (p.node.tipo !== "FLASHCARD" && p.node.tipo !== "QUESTION") continue;
    for (const r of p.node.relacoes) testados.add(r.alvo);
  }
  return parsed
    .filter((p) => p.node.tipo === "CONCEITO" && !testados.has(p.node.id))
    .map((p) => ({
      severity: "aviso" as const,
      relPath: p.relPath,
      message: "CONCEITO sem nenhum flashcard ou questão apontando para ele.",
    }));
}

/**
 * Confere os arquivos do vault e devolve os problemas, erros primeiro.
 *
 * Roda antes do Push: `erro` significa que o envio vai recusar ou gravar coisa
 * errada; `aviso` significa que o Push passa mas descarta algo em silêncio.
 * @example validateVault(await desktop.vault.read(graphDir))
 */
export function validateVault(files: VaultFile[]): VaultIssue[] {
  const { parsed, issues } = parseAll(files);
  const tipoById = new Map(parsed.map((p) => [p.node.id, p.node.tipo as string]));

  const todos = [
    ...issues,
    ...checkDuplicateIds(parsed),
    ...parsed.flatMap((p) => [...checkFolder(p), ...checkBody(p)]),
    ...parsed.flatMap((p) => checkRelations(p, tipoById)),
    ...checkUntestedConcepts(parsed),
  ];
  return todos.sort((a, b) => Number(b.severity === "erro") - Number(a.severity === "erro"));
}

export function countErrors(issues: VaultIssue[]): number {
  return issues.filter((i) => i.severity === "erro").length;
}
