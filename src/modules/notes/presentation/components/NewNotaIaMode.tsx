"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SparklesIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { useRouter } from "@/lib/navigation";
import { notaAiHttp } from "../../infra/http";
import type { NotaCandidata } from "../../application/ports/nota-ai.port";
import { CandidataCard } from "./CandidataCard";

type IAStep = "input" | "analyzing" | "review" | "saving";

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="py-16 text-center space-y-4">
        <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
        <p className="text-lg font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}

export function NewNotaIaMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [rawText, setRawText] = useState("");
  const [step, setStep] = useState<IAStep>("input");
  const [candidatas, setCandidatas] = useState<NotaCandidata[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const wordCount = useMemo(() => rawText.trim().split(/\s+/).filter(Boolean).length, [rawText]);

  const handleAnalyze = async (): Promise<void> => {
    if (!rawText.trim()) { toast.error("Cole algum texto."); return; }
    setStep("analyzing");
    try {
      const { candidatas: found } = await notaAiHttp.analyzeRawText(rawText);
      if (found.length === 0) { toast.error("Nenhuma nota extraida."); setStep("input"); return; }
      setCandidatas(found);
      setSelected(new Set(found.map((_, i) => i)));
      setStep("review");
      toast.success(`${found.length} nota(s) extraida(s)!`);
    } catch (err) { console.error(err); toast.error("Erro ao analisar."); setStep("input"); }
  };

  const handleSave = async (): Promise<void> => {
    const toSave = Array.from(selected).filter((i) => candidatas[i]).map((i) => ({
      titulo: candidatas[i].titulo,
      conteudo: candidatas[i].conteudo,
      conceitosPrevistos: candidatas[i].conceitosPrevistos,
    }));
    if (toSave.length === 0) { toast.error("Selecione ao menos uma nota."); return; }
    setStep("saving");
    try {
      const { notaIds } = await notaAiHttp.saveSelectedNotas(toSave);
      toast.success(`${notaIds.length} nota(s) salva(s)!`);
      router.push("/notes");
    } catch (err) { console.error(err); toast.error("Erro ao salvar."); setStep("review"); }
  };

  const toggle = (i: number): void => setSelected((p) => {
    const n = new Set(p);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });

  if (step === "analyzing") return <LoadingCard label="Analisando texto com IA..." />;
  if (step === "saving") return <LoadingCard label="Salvando notas..." />;

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
          <div>
            <p className="text-sm font-medium">{candidatas.length} nota(s) extraida(s)</p>
            <p className="text-[10px] text-zinc-400">{selected.size} selecionada(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set(candidatas.map((_, i) => i)))}>Todas</Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Nenhuma</Button>
          </div>
        </div>

        <div className="space-y-2">
          {candidatas.map((c, idx) => (
            <CandidataCard
              key={idx}
              candidata={c}
              selected={selected.has(idx)}
              expanded={expandedCard === idx}
              onToggle={() => toggle(idx)}
              onToggleExpand={() => setExpandedCard(expandedCard === idx ? null : idx)}
            />
          ))}
        </div>

        <Separator />
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button variant="outline" onClick={() => setStep("input")} className="w-full sm:w-auto"><XIcon className="size-3.5 mr-1" />Voltar</Button>
          <Button onClick={handleSave} disabled={selected.size === 0} size="lg" className="w-full sm:w-auto">
            <CheckCircle2Icon className="size-4 mr-1" />Salvar {selected.size} nota(s)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Texto bruto</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Cole conteudo. A IA vai separar em notas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="space-y-1">
            <Textarea placeholder="Cole aqui o texto..." value={rawText} onChange={(e) => setRawText(e.target.value)} className="min-h-[250px] sm:min-h-[350px] font-mono text-xs sm:text-sm" rows={14} />
            {wordCount > 0 && <p className="text-[10px] text-zinc-400">{wordCount} palavras</p>}
          </div>
          <Button onClick={handleAnalyze} size="lg" className="w-full"><SparklesIcon className="size-4 mr-1" />Analisar com IA</Button>
        </CardContent>
      </Card>
    </div>
  );
}
