"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SparklesIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { generateGraphFromText, type GenerateGraphResult } from "@/lib/ai-api";

interface GenerateGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onGenerated: () => void;
}

type Step = "input" | "loading" | "done" | "error";

export function GenerateGraphModal({ open, onOpenChange, grafoId, onGenerated }: GenerateGraphModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<GenerateGraphResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = (o: boolean) => {
    if (!o) {
      if (step !== "loading") {
        setStep("input");
        setResult(null);
        setErrorMsg("");
      }
    }
    onOpenChange(o);
  };

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Cole um texto antes de gerar."); return; }
    setStep("loading");
    try {
      const res = await generateGraphFromText(grafoId, text.trim());
      setResult(res);
      setStep("done");
      onGenerated();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar grafo.");
      setStep("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            Gerar grafo a partir de texto
          </DialogTitle>
          <DialogDescription>
            Cole qualquer texto e a IA vai criar automaticamente assunto, tópicos, conceitos, notas e flashcards.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {step === "input" && (
            <textarea
              className="w-full h-64 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Cole o texto aqui... (artigo, capítulo de livro, anotações, etc.)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Analisando texto e criando grafo...</p>
              <p className="text-xs text-center max-w-xs">
                A IA está extraindo conceitos, criando notas e gerando flashcards. Isso pode levar alguns segundos.
              </p>
            </div>
          )}

          {step === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2Icon className="size-12 text-emerald-500" />
              <p className="text-base font-semibold">Grafo criado com sucesso!</p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-sm">
                <StatCard label="Assunto" value={result.assunto} small />
                <StatCard label="Tópicos" value={result.topicos} />
                <StatCard label="Conceitos" value={result.conceitos} />
                <StatCard label="Notas" value={result.notas} />
                <StatCard label="Flashcards" value={result.flashcards} />
                {result.baralho && <StatCard label="Baralho" value={result.baralho} small />}
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={() => setStep("input")}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 border-t pt-3">
          {step === "input" && (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={!text.trim()}>
                <SparklesIcon className="size-4" />
                Gerar grafo com IA
              </Button>
            </>
          )}
          {step === "done" && (
            <Button className="flex-1" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold mt-0.5 ${small ? "text-xs leading-snug" : "text-xl"}`}>{value}</p>
    </div>
  );
}
