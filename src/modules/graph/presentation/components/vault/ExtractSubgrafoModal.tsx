import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2Icon, ScissorsIcon, ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import { invalidateGraphList } from "../../services/graph-list-cache";
import { forgetCachedGraph } from "../../services/graph-cache";
import { GRAFO_REF_RELATIONS } from "./grafo-ref-relations";

interface Props {
  open: boolean;
  onClose: () => void;
  parentGrafoId: string;
  selectedNodes: Array<{ id: string; label: string; type: string }>;
  onExtracted: (grafoId: string, grafoRefNodeId: string) => void;
}

export function ExtractSubgrafoModal({ open, onClose, parentGrafoId, selectedNodes, onExtracted }: Props) {
  const [nome, setNome] = useState("");
  const [tipoRelacao, setTipoRelacao] = useState("APROFUNDA");
  const [saving, setSaving] = useState(false);

  const handleExtract = async (): Promise<void> => {
    if (!nome.trim()) { toast.error("Informe o nome do subgrafo."); return; }
    if (selectedNodes.length === 0) { toast.error("Nenhum nó selecionado."); return; }
    setSaving(true);
    try {
      const result = await graphHttp.extractNodesToSubgrafo(parentGrafoId, {
        nodeIds: selectedNodes.map((n) => n.id),
        nome: nome.trim(),
        tipoRelacao,
      });
      // Subgrafo novo na lista; o pai perdeu nós, então sua vista cacheada é descartada.
      invalidateGraphList();
      forgetCachedGraph(parentGrafoId);
      toast.success(`${result.movedCount} nó(s) extraído(s) · ${result.rewiredEdgeCount} aresta(s) redirecionada(s)`);
      setNome(""); setTipoRelacao("APROFUNDA");
      onExtracted(result.grafoId, result.grafoRefNodeId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao extrair subgrafo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScissorsIcon className="size-5 text-violet-500" />
            Extrair como subgrafo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              {selectedNodes.length} nó(s) serão movidos para o novo grafo
            </Label>
            <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1 p-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {selectedNodes.map((n) => (
                <Badge key={n.id} variant="outline" className="text-[10px] gap-1">
                  <span className="text-zinc-400">{n.type}</span>
                  {n.label.slice(0, 24)}{n.label.length > 24 ? "…" : ""}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ArrowRightIcon className="size-3.5 flex-shrink-0" />
            Arestas externas serão redirecionadas para o nó de referência no grafo pai.
          </div>

          <div className="space-y-1.5">
            <Label>Nome do subgrafo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fundamentos de Cálculo" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Relação com este grafo</Label>
            <Select value={tipoRelacao} onValueChange={(v) => v && setTipoRelacao(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAFO_REF_RELATIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleExtract} disabled={saving || !nome.trim()}>
            {saving ? <Loader2Icon className="size-4 mr-1 animate-spin" /> : <ScissorsIcon className="size-4 mr-1" />}
            Extrair {selectedNodes.length} nó(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
