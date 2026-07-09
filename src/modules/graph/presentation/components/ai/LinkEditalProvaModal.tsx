import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { EditalItemView } from "@/modules/graph/application/ports/graph-prova.port";

interface LinkTarget {
  id: string;
  group: string;
  label: string;
}

type Option = { id: string; label: string };

interface LinkEditalProvaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  // The selected node: either an EDITAL (pick a prova) or a PROVA (pick an edital).
  node: LinkTarget | null;
  // PROVA nodes in the graph, to offer when the selected node is an EDITAL.
  provas: Option[];
  onLinked: () => void;
}

// Loads free (unlinked) editais to offer when linking from a PROVA node. Fetch runs
// only while the modal is open and the selected node is a prova.
function useFreeEditais(enabled: boolean): Option[] {
  const [editais, setEditais] = useState<EditalItemView[]>([]);
  useEffect(() => {
    if (!enabled) return;
    graphHttp.listEditais().then(setEditais).catch(() => setEditais([]));
  }, [enabled]);
  return editais.filter((e) => !e.provaId).map((e) => ({ id: e.id, label: e.titulo }));
}

// Wires the 1:1 edital ↔ prova link (REGE edge) from either side. When an EDITAL
// node is selected the user picks a prova; when a PROVA is selected, an edital.
// Remount per selection (parent keys by node id) keeps the picker state fresh.
export function LinkEditalProvaModal({ open, onOpenChange, grafoId, node, provas, onLinked }: LinkEditalProvaModalProps) {
  const isEdital = node?.group === "EDITAL";
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const freeEditais = useFreeEditais(open && !isEdital);
  const options = isEdital ? provas : freeEditais;

  const handleLink = async (): Promise<void> => {
    if (!node || !targetId) return;
    setBusy(true);
    try {
      const editalId = isEdital ? node.id : targetId;
      const provaId = isEdital ? targetId : node.id;
      await graphHttp.linkEditalToProva(editalId, provaId, grafoId);
      toast.success("Edital vinculado à prova.");
      onLinked();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao vincular");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular edital ↔ prova</DialogTitle>
          <DialogDescription>
            {isEdital
              ? `Escolha a prova regida pelo edital "${node?.label ?? ""}".`
              : `Escolha o edital que rege a prova "${node?.label ?? ""}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <LinkPicker isEdital={isEdital} options={options} targetId={targetId} onTargetId={setTargetId} />
        </div>

        <div className="flex gap-2 border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleLink} disabled={!targetId || busy}>
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
            Vincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LinkPickerProps {
  isEdital: boolean;
  options: Option[];
  targetId: string;
  onTargetId: (id: string) => void;
}

function LinkPicker({ isEdital, options, targetId, onTargetId }: LinkPickerProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isEdital ? "Nenhuma prova no grafo para vincular." : "Nenhum edital livre para vincular."}
      </p>
    );
  }
  return (
    <select
      value={targetId}
      onChange={(e) => onTargetId(e.target.value)}
      className="block w-full rounded-md border bg-background text-foreground px-2 py-1.5 text-sm"
    >
      <option value="">{isEdital ? "Selecione a prova" : "Selecione o edital"}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}
