import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, Share2Icon } from "lucide-react";
import {
  planHubConnections,
  sharedRelationsWithHub,
  type HubMember,
} from "@/modules/graph/domain/selectors/hub-connection";

interface ConnectToHubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hub: HubMember & { nome: string };
  members: HubMember[];
  /** Grava as arestas planejadas; devolve quantas entraram. */
  onConnect: (edges: ReturnType<typeof planHubConnections>["edges"]) => Promise<void>;
}

export function ConnectToHubModal({ open, onOpenChange, hub, members, onConnect }: ConnectToHubModalProps) {
  const [relacao, setRelacao] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // Reseta ao abrir (durante o render — não é setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRelacao(null);
      setSaving(false);
    }
  }

  const relations = sharedRelationsWithHub(hub, members);
  const plan = relacao ? planHubConnections(hub, members, relacao) : null;

  const connect = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await onConnect(plan.edges);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2Icon className="size-4 text-primary" />
            Conectar todos a "{hub.nome}"
          </DialogTitle>
          <DialogDescription>
            Cria uma aresta de cada nó selecionado até este. A direção segue as regras do
            grafo — você escolhe só a relação.
          </DialogDescription>
        </DialogHeader>

        {relations.length === 0 ? (
          <NoRelationsView />
        ) : (
          <RelationPicker relations={relations} selected={relacao} onSelect={setRelacao} />
        )}

        {plan && plan.skipped > 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-500">
            {plan.skipped} nó(s) da seleção não aceitam esta relação e serão ignorados.
          </p>
        )}

        <Separator />
        <Button className="w-full gap-2" onClick={connect} disabled={!plan?.edges.length || saving}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <Share2Icon className="size-4" />}
          {plan?.edges.length ? `Criar ${plan.edges.length} aresta(s)` : "Escolha uma relação"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function RelationPicker({ relations, selected, onSelect }: { relations: string[]; selected: string | null; onSelect: (r: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {relations.map((r) => (
        <button
          key={r}
          onClick={() => onSelect(r)}
          className={`rounded-md border px-2.5 py-1 text-xs font-mono transition-all ${
            selected === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// Só relações válidas para TODOS os selecionados são oferecidas; quando a seleção
// mistura tipos demais, não sobra nenhuma — e dizer isso é melhor que uma lista vazia.
function NoRelationsView() {
  return (
    <p className="text-xs text-muted-foreground py-2">
      Nenhuma relação serve para todos os nós selecionados ao mesmo tempo. Reduza a seleção a
      tipos compatíveis com este nó.
    </p>
  );
}
