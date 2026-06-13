"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  importGraph,
  type ImportGraphNode,
  type ImportGraphEdge,
  type ImportGraphPayload,
} from "@/actions/graph";
import {
  isRelationAllowed,
  getAllowedRelations,
  RELATION_PAIRS,
} from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";

interface ImportJsonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onSuccess?: () => void;
}

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

const EXEMPLO = JSON.stringify(
  {
    nodes: [
      { ref: "a1", tipo: "ASSUNTO", nome: "Redes de Computadores", descricao: null },
      { ref: "t1", tipo: "TOPICO", nome: "Protocolos de Aplicação", descricao: null },
      { ref: "c1", tipo: "CONCEITO", nome: "HTTP", descricao: null },
      {
        ref: "n1",
        tipo: "NOTA",
        titulo: "HTTP é um protocolo da camada de aplicação",
        conteudo: "# HTTP\n\nO **HTTP** transfere informações entre dispositivos em rede.",
        tipoNota: "PERMANENTE",
        subtipo: "DEFINICAO",
        fonte: null,
      },
      { ref: "f1", tipo: "FLASHCARD", pergunta: "O que é HTTP?", resposta: "Protocolo de transferência de hipertexto da Web." },
      { ref: "b1", tipo: "BARALHO", titulo: "Revisão de Redes" },
    ],
    edges: [
      { origem: "t1", destino: "a1", relacao: "PERTENCE_A", peso: 1 },
      { origem: "c1", destino: "t1", relacao: "PERTENCE_A", peso: 1 },
      { origem: "n1", destino: "c1", relacao: "DEFINE", peso: 1 },
      { origem: "f1", destino: "n1", relacao: "TESTA" },
      { origem: "f1", destino: "c1", relacao: "HERDA" },
      { origem: "b1", destino: "f1", relacao: "CONTEM" },
    ],
  },
  null,
  2
);

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

// Valida e normaliza o JSON genérico (nós + arestas) — paridade com o servidor.
function parseGraphImport(raw: string): ImportGraphPayload {
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
  const root = parsed as Record<string, unknown>;
  const rawNodes = root.nodes;
  const rawEdges = root.edges ?? [];
  if (!Array.isArray(rawNodes)) throw new Error('"nodes" deve ser um array.');
  if (!Array.isArray(rawEdges)) throw new Error('"edges" deve ser um array.');
  if (rawNodes.length === 0) throw new Error("Forneça ao menos um nó em \"nodes\".");
  if (rawNodes.length > LIMITS.nodes) throw new Error(`Máximo de ${LIMITS.nodes} nós.`);
  if (rawEdges.length > LIMITS.edges) throw new Error(`Máximo de ${LIMITS.edges} arestas.`);

  const refTipo = new Map<string, string>();
  const nodes: ImportGraphNode[] = rawNodes.map((item, i) => {
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
    if (tipo === "ASSUNTO" || tipo === "TOPICO" || tipo === "CONCEITO") {
      node.nome = readStr(o.nome, "nome", LIMITS.nome, pos);
      if (!node.nome) throw new Error(`"nome" é obrigatório${pos}.`);
      node.descricao = readStr(o.descricao, "descricao", LIMITS.descricao, pos) || null;
    } else if (tipo === "FLASHCARD") {
      node.pergunta = readStr(o.pergunta, "pergunta", LIMITS.pergunta, pos);
      node.resposta = readStr(o.resposta, "resposta", LIMITS.resposta, pos);
      if (!node.pergunta || !node.resposta) throw new Error(`Flashcard exige "pergunta" e "resposta"${pos}.`);
    } else if (tipo === "NOTA") {
      node.conteudo = readStr(o.conteudo, "conteudo", LIMITS.conteudo, pos);
      if (!node.conteudo) throw new Error(`Nota exige "conteudo"${pos}.`);
      // título opcional: se faltar, deriva do conteúdo
      node.titulo = readStr(o.titulo, "titulo", LIMITS.titulo, pos) || deriveTitulo(node.conteudo);
      node.tipoNota = typeof o.tipoNota === "string" ? o.tipoNota : "PERMANENTE";
      if (!NOTA_TIPOS.includes(node.tipoNota)) throw new Error(`"tipoNota" inválido${pos}. Use: ${NOTA_TIPOS.join(", ")}.`);
      node.subtipo = typeof o.subtipo === "string" ? o.subtipo : "";
      if (!NOTA_SUBTIPOS.includes(node.subtipo)) throw new Error(`"subtipo" inválido${pos}. Use: ${NOTA_SUBTIPOS.join(", ")}.`);
      node.fonte = readStr(o.fonte, "fonte", LIMITS.fonte, pos) || null;
      if (node.tipoNota === "LITERATURA" && !node.fonte) throw new Error(`Notas LITERATURA exigem "fonte"${pos}.`);
    } else if (tipo === "TEXTO_BRUTO") {
      node.titulo = readStr(o.titulo, "titulo", LIMITS.titulo, pos) || "Texto sem título";
      node.texto = readStr(o.texto, "texto", LIMITS.texto, pos);
      if (!node.texto) throw new Error(`Texto bruto exige "texto"${pos}.`);
    } else if (tipo === "BARALHO") {
      // aceita "nome" como alias de "titulo"
      node.titulo = readStr(o.titulo ?? o.nome, "titulo", LIMITS.titulo, pos);
      if (!node.titulo) throw new Error(`Baralho exige "titulo"${pos}.`);
    }
    return node;
  });

  const edges: ImportGraphEdge[] = rawEdges.map((item, i) => {
    const pos = ` (aresta #${i + 1})`;
    if (typeof item !== "object" || item === null) throw new Error(`Cada aresta deve ser um objeto${pos}.`);
    const o = item as Record<string, unknown>;
    const origem = typeof o.origem === "string" ? o.origem.trim() : "";
    const destino = typeof o.destino === "string" ? o.destino.trim() : "";
    const relacao = typeof o.relacao === "string" ? o.relacao : "";
    const to = refTipo.get(origem);
    const td = refTipo.get(destino);
    if (!to) throw new Error(`"origem" desconhecida ("${origem || "?"}")${pos}.`);
    if (!td) throw new Error(`"destino" desconhecido ("${destino || "?"}")${pos}.`);
    if (origem === destino) throw new Error(`Aresta não pode ligar um nó a si mesmo${pos}.`);
    if (!isRelationAllowed(to, td, relacao)) {
      const allowed = getAllowedRelations(to, td);
      throw new Error(
        `Relação "${relacao || "(vazia)"}" não permitida entre ${to} e ${td}${pos}. ${allowed.length ? `Permitidas: ${allowed.join(", ")}.` : "Esses tipos não podem se relacionar."}`
      );
    }
    let peso: number | undefined;
    if (o.peso !== undefined && o.peso !== null) {
      if (typeof o.peso !== "number" || !Number.isFinite(o.peso) || o.peso <= 0 || o.peso > 2) {
        throw new Error(`"peso" deve ser um número entre 0 e 2${pos}.`);
      }
      peso = o.peso;
    }
    return { origem, destino, relacao, peso };
  });

  return { nodes, edges };
}

export function ImportJsonModal({ open, onOpenChange, grafoId, onSuccess }: ImportJsonModalProps) {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = (o: boolean) => {
    if (!o) setJsonInput("");
    onOpenChange(o);
  };

  const handleImport = async () => {
    let payload: ImportGraphPayload;
    try {
      payload = parseGraphImport(jsonInput);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON inválido");
      return;
    }
    setLoading(true);
    try {
      const r = await importGraph(grafoId, payload);
      toast.success(
        `${r.nodes} nó(s) e ${r.edges} relação(ões) importados!` +
          (r.reused > 0 ? ` ${r.reused} já existia(m) no grafo e foi(ram) reaproveitado(s).` : "")
      );
      setJsonInput("");
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (e) {
      // transação revertida — nada foi criado
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Importar JSON</DialogTitle>
          <DialogDescription>
            Cole um grafo em JSON (nós + relações). Suporta todos os tipos de nó, validado pelas regras da legenda.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="import-json">Grafo em JSON</Label>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setJsonInput(EXEMPLO)}>
              Carregar exemplo
            </Button>
          </div>
          <Textarea
            id="import-json"
            spellCheck={false}
            placeholder='{ "nodes": [ { "ref": "c1", "tipo": "CONCEITO", "nome": "..." } ], "edges": [] }'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />

          <details className="rounded-md border border-zinc-200 dark:border-zinc-800 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none px-2.5 py-2 font-medium text-foreground">
              Formato e regras
            </summary>
            <div className="space-y-2 px-2.5 pb-2.5">
              <p>
                Objeto <code>{"{ nodes, edges }"}</code>. Cada nó tem <code>ref</code> (id local) e
                {" "}<code>tipo</code>; as arestas referenciam os nós por <code>origem</code>/<code>destino</code>.
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>ASSUNTO/TOPICO/CONCEITO</strong>: <code>nome</code> (+ <code>descricao</code>)</li>
                <li><strong>FLASHCARD</strong>: <code>pergunta</code>, <code>resposta</code></li>
                <li><strong>NOTA</strong>: <code>titulo</code>, <code>conteudo</code> (Markdown), <code>tipoNota</code>, <code>subtipo</code>, <code>fonte</code></li>
                <li><strong>TEXTO_BRUTO</strong>: <code>titulo</code>, <code>texto</code></li>
                <li><strong>BARALHO</strong>: <code>titulo</code></li>
              </ul>
              <p className="pt-1">
                Aresta: <code>{"{ origem, destino, relacao, peso? }"}</code> (peso 0–2, padrão 1).
                Relações permitidas (origem–destino):
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {RELATION_PAIRS.map((p) => (
                  <li key={`${p.a}-${p.b}`}>
                    {p.a.toLowerCase()} → {p.b.toLowerCase()}:{" "}
                    {p.relations.map((r) => RELATION_LABELS[r] ?? r).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <><UploadIcon className="size-4" /> Importar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
