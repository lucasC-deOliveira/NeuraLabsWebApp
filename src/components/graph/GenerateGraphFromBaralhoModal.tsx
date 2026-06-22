"use client";

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
import {
  listBaralhosInGrafo, populateGraphFromBaralho,
  type BaralhoItem, type PopulateFromBaralhoResult,
} from "@/lib/ai-api";

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

  useEffect(() => {
    if (!open) return;
    setPhase("select");
    setSelected(null);
    setResult(null);
    setErrorMsg("");
    setSearch("");
    setLoadingList(true);
    listBaralhosInGrafo(grafoId)
      .then((data) => setBaralhos(Array.isArray(data) ? data : []))
      .catch((e) => {
        toast.error(e?.message ?? "Erro ao carregar baralhos.");
        setBaralhos([]);
      })
      .finally(() => setLoadingList(false));
  }, [open]);

  const filtered = baralhos.filter((b) =>
    b.titulo.toLowerCase().includes(search.toLowerCase()),
  );

  const handleGenerate = async () => {
    if (!selected) return;
    setPhase("generating");
    try {
      const res = await populateGraphFromBaralho(grafoId, selected.id);
      setResult(res);
      setPhase("done");
      onGenerated?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao expandir grafo.");
      setPhase("error");
    }
  };

  const handleClose = (o: boolean) => {
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
            <div className="space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar baralho..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {loadingList ? (
                <div className="flex justify-center py-8">
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? "Nenhum baralho encontrado." : "Nenhum baralho disponível neste grafo."}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filtered.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected?.id === b.id
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <LayersIcon className={`size-4 shrink-0 ${selected?.id === b.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{b.titulo}</p>
                        <p className="text-xs text-muted-foreground">{b.flashcardCount} flashcard{b.flashcardCount !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "generating" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2Icon className="size-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">Expandindo grafo…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A IA está analisando os flashcards de <strong>{selected?.titulo}</strong>
                </p>
              </div>
            </div>
          )}

          {phase === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2Icon className="size-12 text-emerald-500" />
              <p className="text-base font-semibold">Grafo expandido com sucesso!</p>
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs text-sm">
                <StatCard label="Assuntos" value={result.assuntos} />
                <StatCard label="Tópicos" value={result.topicos} />
                <StatCard label="Conceitos" value={result.conceitos} />
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={() => setPhase("select")}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 border-t pt-3">
          {phase === "select" && (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleGenerate}
                disabled={!selected}
              >
                <SparklesIcon className="size-4" />
                Expandir grafo
              </Button>
            </>
          )}
          {phase === "generating" && (
            <Button className="flex-1" variant="secondary" disabled>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Processando…
            </Button>
          )}
          {phase === "done" && (
            <Button className="flex-1" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          )}
          {phase === "error" && (
            <Button variant="ghost" className="flex-1" onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </div>
  );
}
