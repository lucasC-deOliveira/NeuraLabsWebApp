import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2Icon, SparklesIcon, CheckCircle2Icon, AlertCircleIcon,
  SearchIcon, LayersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { BaralhoItem, PopulateFromBaralhoResult } from "@/modules/graph/application/ports/graph-ai.port";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onGenerated?: () => void;
}

type Phase = "select" | "generating" | "done" | "error";

export function GenerateGraphFromBaralhoModal({ open, onOpenChange, grafoId, onGenerated }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [baralhos, setBaralhos] = useState<BaralhoItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BaralhoItem | null>(null);
  const [result, setResult] = useState<PopulateFromBaralhoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset during render on open transition (react-hooks v7 forbids synchronous
  // setState in the effect body). The effect below only loads the deck list.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("select");
      setSelected(null);
      setResult(null);
      setErrorMsg("");
      setSearch("");
      setLoadingList(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .listBaralhosInGrafo(grafoId)
      .then((data): void => { if (!ignore) setBaralhos(Array.isArray(data) ? data : []); })
      .catch((e): void => {
        if (ignore) return;
        toast.error(e instanceof Error ? e.message : "Erro ao carregar baralhos.");
        setBaralhos([]);
      })
      .finally((): void => { if (!ignore) setLoadingList(false); });
    return (): void => { ignore = true; };
  }, [open, grafoId]);

  const filtered = baralhos.filter((b) => b.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleGenerate = async (): Promise<void> => {
    if (!selected) return;
    setPhase("generating");
    try {
      const res = await graphHttp.populateGraphFromBaralho(grafoId, selected.id);
      setResult(res);
      setPhase("done");
      onGenerated?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao expandir grafo.");
      setPhase("error");
    }
  };

  const handleClose = (o: boolean): void => {
    if (!o && phase === "generating") return;
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg flex max-h-[80dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            Expandir grafo com baralho
          </DialogTitle>
          <DialogDescription>
            A IA analisa os flashcards e adiciona assunto, tópicos e conceitos neste grafo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {phase === "select" && (
            <SelectView
              search={search}
              onSearch={setSearch}
              loadingList={loadingList}
              filtered={filtered}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {phase === "generating" && <GeneratingView deckName={selected?.titulo} />}
          {phase === "done" && result && <DoneView result={result} />}
          {phase === "error" && <ErrorView message={errorMsg} onRetry={() => setPhase("select")} />}
        </div>

        <div className="shrink-0 flex gap-2 border-t pt-3">
          <ModalFooter
            phase={phase}
            canGenerate={!!selected}
            onClose={() => handleClose(false)}
            onGenerate={handleGenerate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SelectView({
  search,
  onSearch,
  loadingList,
  filtered,
  selected,
  onSelect,
}: {
  search: string;
  onSearch: (v: string) => void;
  loadingList: boolean;
  filtered: BaralhoItem[];
  selected: BaralhoItem | null;
  onSelect: (b: BaralhoItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar baralho..." value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
      <DeckList loadingList={loadingList} filtered={filtered} selected={selected} onSelect={onSelect} hasSearch={!!search} />
    </div>
  );
}

function DeckList({
  loadingList,
  filtered,
  selected,
  onSelect,
  hasSearch,
}: {
  loadingList: boolean;
  filtered: BaralhoItem[];
  selected: BaralhoItem | null;
  onSelect: (b: BaralhoItem) => void;
  hasSearch: boolean;
}) {
  if (loadingList) {
    return (
      <div className="flex justify-center py-8">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {hasSearch ? "Nenhum baralho encontrado." : "Nenhum baralho disponível neste grafo."}
      </p>
    );
  }
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {filtered.map((b) => (
        <DeckRow key={b.id} baralho={b} active={selected?.id === b.id} onSelect={() => onSelect(b)} />
      ))}
    </div>
  );
}

function DeckRow({ baralho, active, onSelect }: { baralho: BaralhoItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active ? "border-primary bg-primary/8 text-foreground" : "border-border hover:bg-muted/50"
      }`}
    >
      <LayersIcon className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{baralho.titulo}</p>
        <p className="text-xs text-muted-foreground">
          {baralho.flashcardCount} flashcard{baralho.flashcardCount !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

function GeneratingView({ deckName }: { deckName?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <Loader2Icon className="size-10 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium">Expandindo grafo…</p>
        <p className="text-xs text-muted-foreground mt-1">
          A IA está analisando os flashcards de <strong>{deckName}</strong>
        </p>
      </div>
    </div>
  );
}

function DoneView({ result }: { result: PopulateFromBaralhoResult }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <CheckCircle2Icon className="size-12 text-emerald-500" />
      <p className="text-base font-semibold">Grafo expandido com sucesso!</p>
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs text-sm">
        <StatCard label="Assuntos" value={result.assuntos} />
        <StatCard label="Tópicos" value={result.topicos} />
        <StatCard label="Conceitos" value={result.conceitos} />
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

function ModalFooter({
  phase,
  canGenerate,
  onClose,
  onGenerate,
}: {
  phase: Phase;
  canGenerate: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  if (phase === "select") {
    return (
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 gap-2" onClick={onGenerate} disabled={!canGenerate}>
          <SparklesIcon className="size-4" />
          Expandir grafo
        </Button>
      </>
    );
  }
  if (phase === "generating") {
    return (
      <Button className="flex-1" variant="secondary" disabled>
        <Loader2Icon className="size-4 mr-2 animate-spin" />
        Processando…
      </Button>
    );
  }
  if (phase === "done") {
    return <Button className="flex-1" onClick={onClose}>Fechar</Button>;
  }
  return <Button variant="ghost" className="flex-1" onClick={onClose}>Fechar</Button>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </div>
  );
}
