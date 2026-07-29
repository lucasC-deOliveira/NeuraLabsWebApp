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
import { useRouter } from "@/lib/navigation";
import { graphHttp } from "@/modules/graph/infra/http";
import type { ImportGraphPayload } from "@/modules/graph/domain/types/graph-import.types";
import { parseGraphImport } from "@/modules/graph/domain/services/graph-json-import";
import { invalidateGraphList } from "../../services/graph-list-cache";
import { forgetCachedGraph } from "../../services/graph-cache";
import { RELATION_PAIRS } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";

interface ImportJsonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onSuccess?: () => void;
}

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
  2,
);

export function ImportJsonModal({ open, onOpenChange, grafoId, onSuccess }: ImportJsonModalProps) {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = (o: boolean): void => {
    if (!o) setJsonInput("");
    onOpenChange(o);
  };

  const handleImport = async (): Promise<void> => {
    let payload: ImportGraphPayload;
    try {
      payload = parseGraphImport(jsonInput);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON inválido");
      return;
    }
    setLoading(true);
    try {
      const r = await graphHttp.importGraph(grafoId, payload);
      // O conteúdo do grafo mudou (vista descartada) e a lista reflete os novos nós.
      forgetCachedGraph(grafoId);
      invalidateGraphList();
      toast.success(
        `${r.nodes} nó(s) e ${r.edges} relação(ões) importados!` +
          (r.reused > 0 ? ` ${r.reused} já existia(m) no grafo e foi(ram) reaproveitado(s).` : ""),
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

          <ImportFormatHelp />
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

function ImportFormatHelp() {
  return (
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
  );
}
