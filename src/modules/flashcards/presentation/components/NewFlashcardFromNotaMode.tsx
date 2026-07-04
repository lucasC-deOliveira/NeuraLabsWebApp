"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { useRouter } from "@/lib/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { flashcardGenHttp } from "../../infra/http";
import type { FlashcardPreview, NotaForGen } from "../../domain/flashcard-source.types";
import { NotaPickerList } from "./from-nota/NotaPickerList";
import { PreviewList } from "./from-nota/PreviewList";

type AnalysisMode = "content" | "ia";

function DoneState({ count, onSeeAll, onMore }: { count: number; onSeeAll: () => void; onMore: () => void }) {
  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
      <CardContent className="py-16 text-center space-y-4">
        <CheckCircle2Icon className="size-12 mx-auto text-emerald-500" />
        <p className="text-xl font-semibold">{count} flashcard(s) criado(s) com sucesso!</p>
        <p className="text-sm text-zinc-500">Os flashcards foram vinculados à nota de origem com relacao GERADO.</p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" onClick={onSeeAll}>Ver flashcards</Button>
          <Button onClick={onMore}>Gerar mais</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewLoading({ mode }: { mode: AnalysisMode }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="py-20 text-center space-y-4">
        <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
        <p className="text-lg font-medium">{mode === "ia" ? "Gerando flashcards com IA..." : "Extraindo flashcards da nota..."}</p>
        <p className="text-sm text-zinc-400">{mode === "ia" ? "Analisando conteudo e criando tipos variados" : "Identificando definicoes e conceitos"}</p>
      </CardContent>
    </Card>
  );
}

export function NewFlashcardFromNotaMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [notas, setNotas] = useState<NotaForGen[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(true);
  const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);
  const [selectedNotaName, setSelectedNotaName] = useState("");
  const [selectedNotaDate, setSelectedNotaDate] = useState<Date | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("content");
  const [previewCards, setPreviewCards] = useState<FlashcardPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [searchPreview, setSearchPreview] = useState("");

  useEffect(() => {
    flashcardGenHttp.listNotas()
      .then((data) => { setNotas(data); setLoadingNotas(false); })
      .catch(() => setLoadingNotas(false));
  }, []);

  const handleGeneratePreview = async (notaId: string, mode: AnalysisMode): Promise<void> => {
    setSelectedNotaId(notaId);
    setAnalysisMode(mode);
    setLoadingPreview(true);
    try {
      const nota = notas.find((n) => n.id === notaId);
      setSelectedNotaName(nota?.preview.split("\n")[0].replace(/^#+\s*/, "") || "Nota");
      setSelectedNotaDate(nota?.dataCriacao ?? null);
      const cards = mode === "ia" ? await flashcardGenHttp.generateViaIA(notaId) : await flashcardGenHttp.previewFromNota(notaId);
      if (cards.length === 0) {
        toast.info("Nenhum flashcard pôde ser gerado desta nota.");
        setSelectedNotaId(null);
        setPreviewCards([]);
      } else {
        setPreviewCards(cards);
        setSelectedCards(new Set(cards.map((c) => c.id)));
        toast.success(`${cards.length} flashcard(s) encontrado(s)!`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar preview.");
      setSelectedNotaId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleCard = (id: string): void => setSelectedCards((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleGroup = (cardIds: string[], allSelected: boolean): void => setSelectedCards((prev) => {
    const next = new Set(prev);
    for (const id of cardIds) { if (allSelected) next.delete(id); else next.add(id); }
    return next;
  });

  const handleBackToNotes = (): void => {
    setSelectedNotaId(null);
    setPreviewCards([]);
    setSelectedCards(new Set());
    setSearchPreview("");
  };

  const handleSaveSelected = async (): Promise<void> => {
    const toSave = previewCards.filter((c) => selectedCards.has(c.id));
    if (toSave.length === 0) { toast.warning("Selecione ao menos um flashcard."); return; }
    if (!selectedNotaId) { toast.error("Nota nao identificada."); return; }
    setSaving(true);
    try {
      const result = await flashcardGenHttp.savePreviews(
        selectedNotaId,
        toSave.map((c) => ({ pergunta: c.pergunta, resposta: c.resposta, conceitoId: c.conceitoId })),
      );
      setDoneCount(result.count);
      toast.success(`${result.count} flashcard(s) criado(s)!`);
    } catch {
      toast.error("Erro ao salvar flashcards.");
    } finally {
      setSaving(false);
    }
  };

  if (doneCount > 0) {
    return <DoneState count={doneCount} onSeeAll={() => router.push("/flashcards")} onMore={() => { setDoneCount(0); handleBackToNotes(); }} />;
  }
  if (loadingPreview) return <PreviewLoading mode={analysisMode} />;

  if (previewCards.length > 0) {
    return (
      <PreviewList
        selectedNotaName={selectedNotaName}
        selectedNotaDate={selectedNotaDate}
        analysisMode={analysisMode}
        previewCards={previewCards}
        selectedCards={selectedCards}
        searchPreview={searchPreview}
        saving={saving}
        onBack={handleBackToNotes}
        onSearch={setSearchPreview}
        onToggleCard={toggleCard}
        onSelectAll={() => setSelectedCards(new Set(previewCards.map((c) => c.id)))}
        onSelectNone={() => setSelectedCards(new Set())}
        onToggleGroup={toggleGroup}
        onSave={handleSaveSelected}
      />
    );
  }

  return (
    <NotaPickerList
      notas={notas}
      loading={loadingNotas}
      onGenerate={handleGeneratePreview}
      onCreateNota={() => router.push("/notes/new")}
    />
  );
}
