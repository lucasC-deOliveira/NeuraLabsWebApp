"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon, FileTextIcon, ArrowRightIcon, SparklesIcon, CheckCircle2Icon,
  ChevronDownIcon, ChevronRightIcon, BrainIcon, XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeRawText,
  saveSelectedNotas,
  type NotaCandidata,
  type SaveSelectedNotaInput,
} from "@/actions/notes";

type Step = "input" | "analyzing" | "review" | "saving";

export default function NewNotaPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [candidatas, setCandidatas] = useState<NotaCandidata[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      toast.error("Cole algum texto antes de analisar.");
      return;
    }

    setStep("analyzing");
    try {
      const { candidatas } = await analyzeRawText(rawText);
      if (candidatas.length === 0) {
        toast.error("Nenhuma nota pôde ser extraída do texto.");
        setStep("input");
        return;
      }
      setCandidatas(candidatas);
      setSelected(new Set(candidatas.map((_, i) => i))); // all selected by default
      setStep("review");
      toast.success(`${candidatas.length} nota(s) candidata(s) encontrada(s)!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao analisar texto. Tente novamente.");
      setStep("input");
    }
  };

  const handleSave = async () => {
    const toSave: SaveSelectedNotaInput[] = [];
    selected.forEach((i) => {
      if (candidatas[i]) toSave.push({ titulo: candidatas[i].titulo, conteudo: candidatas[i].conteudo });
    });

    if (toSave.length === 0) {
      toast.error("Selecione ao menos uma nota para salvar.");
      return;
    }

    setStep("saving");
    try {
      const { notaIds } = await saveSelectedNotas(toSave);
      toast.success(`${notaIds.length} nota(s) salva(s) com sucesso!`);
      router.push("/notes");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar notas. Tente novamente.");
      setStep("review");
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(candidatas.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Nova Nota</h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Cole texto bruto e a IA vai identificar quantas notas ele gera. Você escolhe quais salvar.
        </p>
      </div>

      <Separator />

      {/* Step indicator */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className={`flex items-center gap-1.5 font-medium ${step === "input" ? "text-primary" : step === "analyzing" || step === "review" ? "text-zinc-400" : "text-green-500"}`}>
          <FileTextIcon className="size-3.5 sm:size-4" />
          <span className="hidden sm:inline">Texto</span>
          <span className="sm:hidden font-bold">1</span>
          <CheckCircle2Icon className="size-3 text-green-500 hidden sm:inline" />
        </div>
        <ArrowRightIcon className="size-3 text-zinc-300" />
        <div className={`flex items-center gap-1.5 font-medium ${step === "analyzing" ? "text-primary" : step === "review" ? "text-green-500" : "text-zinc-400"}`}>
          <SparklesIcon className="size-3.5 sm:size-4" />
          <span className="hidden sm:inline">Análise IA</span>
          <span className="sm:hidden font-bold">2</span>
          <CheckCircle2Icon className="size-3 text-green-500 hidden sm:inline" />
        </div>
        <ArrowRightIcon className="size-3 text-zinc-300" />
        <div className={`flex items-center gap-1.5 font-medium ${step === "review" ? "text-primary" : "text-zinc-400"}`}>
          <BrainIcon className="size-3.5 sm:size-4" />
          <span className="hidden sm:inline">Revisar</span>
          <span className="sm:hidden font-bold">3</span>
        </div>
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Texto bruto</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cole conteúdo de aula, artigo ou resumo. A IA vai detectar seções e separar em notas candidatas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            <Textarea
              placeholder="Cole aqui o texto da aula, artigo ou qualquer conteúdo que quer transformar em notas..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[250px] sm:min-h-[350px] font-mono text-xs sm:text-sm"
              rows={14}
            />
            <Button onClick={handleAnalyze} size="lg" className="w-full">
              <SparklesIcon className="size-4 mr-1" />
              Analisar com IA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1.5: Analyzing */}
      {step === "analyzing" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 sm:py-20 text-center space-y-4">
            <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
            <div>
              <p className="text-lg font-medium">Analisando texto com IA...</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Identificando conceitos, tópicos e notas candidatas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review candidates */}
      {step === "review" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Summary bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">
                {candidatas.length} nota(s) candidata{candidatas.length > 1 ? "s" : ""}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecione quais deseja salvar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar todas
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Nenhuma
              </Button>
              <span className="text-sm text-zinc-400">
                {selected.size}/{candidatas.length} selecionada{selected.size !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <Separator />

          {/* Candidate cards */}
          <div className="space-y-3">
            {candidatas.map((candidata, idx) => (
              <Card
                key={idx}
                className={`border-zinc-200 dark:border-zinc-800 transition-all ${
                  selected.has(idx)
                    ? "border-primary/30 dark:border-primary/20 bg-primary/[0.02]"
                    : "opacity-60"
                }`}
              >
                <button
                  onClick={() => toggleSelect(idx)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-2 px-3 sm:px-6">
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div className="mt-0.5 flex-shrink-0">
                        <div
                          className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selected.has(idx)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {selected.has(idx) && (
                            <CheckCircle2Icon className="size-3.5" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium">{candidata.titulo}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {candidata.conteudo.slice(0, 100)}...
                        </p>
                      </div>

                      <span className="text-xs text-zinc-400 flex-shrink-0 tabular-nums">
                        #{idx + 1}
                      </span>
                    </div>

                    {candidata.conceitosPrevistos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {candidata.conceitosPrevistos.map((c, ci) => (
                          <Badge key={ci} variant="outline" className="text-[10px] px-1.5 h-5">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                </button>

                <CardContent className="pt-0 pb-4 px-3 sm:px-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-400 h-7 px-1"
                    onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                  >
                    {expandedCard === idx ? (
                      <ChevronDownIcon className="size-3.5 mr-1" />
                    ) : (
                      <ChevronRightIcon className="size-3.5 mr-1" />
                    )}
                    {expandedCard === idx ? "Ocultar" : "Ver conteúdo"}
                  </Button>

                  {expandedCard === idx && (
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 rounded-md p-3 border border-zinc-100 dark:border-zinc-800">
                      {candidata.conteudo}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setStep("input")} className="w-full sm:w-auto">
              <XIcon className="size-3.5 mr-1" />
              Voltar e editar texto
            </Button>
            <Button
              onClick={handleSave}
              disabled={selected.size === 0}
              size="lg"
              className="w-full sm:w-auto"
            >
              <CheckCircle2Icon className="size-4 mr-1" />
              Salvar {selected.size} nota{selected.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Saving */}
      {step === "saving" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 sm:py-20 text-center space-y-4">
            <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
            <div>
              <p className="text-lg font-medium">Salvando notas...</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Criando vínculos semânticos e nós do grafo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
