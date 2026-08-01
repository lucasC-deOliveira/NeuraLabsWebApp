"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { useRouter } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2Icon, CheckCircle2Icon, EyeIcon, AlertCircleIcon } from "lucide-react";
import {
  flattenConceptTree,
  type ConceitoArvore, type FlatConcept,
  type PendingAssunto, type PendingTopic, type PendingConcept,
} from "@/modules/content";
import { NewConceptCard } from "@/modules/content/ui";
import { contentHttp, flashcardsHttp } from "../../infra/http";
import { buildManualCard, type ManualCardType } from "../../domain/manual-card";
import {
  MANUAL_CARD_SCHEMAS, EMPTY_MANUAL_FORM_VALUES, toManualCardFields,
  type ManualCardFormValues,
} from "../../domain/services/manual-card-schema";
import { saveManualFlashcard } from "../../application/use-cases/save-manual-flashcard";
import { MANUAL_TYPES } from "../constants/manual-types";
import { ManualTypeSelector } from "./manual/ManualTypeSelector";
import { ManualCardForm } from "./manual/ManualCardForm";
import { ConceptSinglePicker } from "./manual/ConceptSinglePicker";

const PENDING_PREFIX = "pending:";

export function NewFlashcardManualMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tipo, setTipo] = useState<ManualCardType>("DEFINICAO");
  const [saving, setSaving] = useState(false);

  // O resolver acompanha o tipo selecionado: cada tipo exige campos diferentes.
  // O RHF relê as opções a cada render, então trocar o tipo troca a validação.
  const form = useForm<ManualCardFormValues>({
    resolver: zodResolver(MANUAL_CARD_SCHEMAS[tipo]),
    defaultValues: EMPTY_MANUAL_FORM_VALUES,
  });

  const [arvore, setArvore] = useState<ConceitoArvore[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [flatConcepts, setFlatConcepts] = useState<FlatConcept[]>([]);

  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [pendingAssuntos, setPendingAssuntos] = useState<PendingAssunto[]>([]);
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [pendingConcepts, setPendingConcepts] = useState<PendingConcept[]>([]);

  useEffect(() => {
    contentHttp
      .getHierarquiaConceitos()
      .then((tree) => { setArvore(tree); setFlatConcepts(flattenConceptTree(tree).flat); })
      .catch(() => { /* keep empty tree */ })
      .finally(() => setLoadingConcepts(false));
  }, []);

  // A prévia acompanha a digitação. useWatch (e não form.watch()) porque o React
  // Compiler não consegue memoizar o watch() retornado pelo useForm.
  const draft = useWatch({ control: form.control });
  const card = buildManualCard(tipo, toManualCardFields(draft));
  const hasContent = !!card.pergunta.trim();
  const hasSelectedConcept = !!selectedConceptId;

  // Trocar de tipo mantém o que já foi digitado, mas os erros do tipo anterior
  // não valem mais para os campos que passam a ser exigidos.
  const selectType = (next: ManualCardType): void => {
    setTipo(next);
    form.clearErrors();
  };
  const typeLabel = MANUAL_TYPES.find((t) => t.value === tipo)!;

  const selectedDisplay = useMemo(() => {
    if (selectedConceptId.startsWith(PENDING_PREFIX)) {
      const tempId = selectedConceptId.slice(PENDING_PREFIX.length);
      return pendingConcepts.find((c) => c.tempId === tempId)?.nome ?? "";
    }
    return flatConcepts.find((c) => c.id === selectedConceptId)?.nome ?? "";
  }, [selectedConceptId, pendingConcepts, flatConcepts]);

  const addConcept = (concept: PendingConcept, newTopics: PendingTopic[]): void => {
    setPendingTopics((prev) => {
      const existing = new Set(prev.map((p) => p.tempId));
      return [...prev, ...newTopics.filter((p) => !existing.has(p.tempId))];
    });
    setPendingConcepts((prev) => [...prev, concept]);
    setSelectedConceptId(`${PENDING_PREFIX}${concept.tempId}`);
  };

  const handleSave = async (values: ManualCardFormValues): Promise<void> => {
    if (!hasSelectedConcept) { toast.error("Selecione ou adicione um conceito."); return; }
    setSaving(true);
    try {
      await saveManualFlashcard(
        { content: contentHttp, flashcards: flashcardsHttp },
        {
          selectedConceptId, tipo,
          card: buildManualCard(tipo, toManualCardFields(values)),
          staged: { tree: arvore, pendingAssuntos, pendingTopics, pendingConcepts },
        },
      );
      toast.success("Flashcard criado!");
      router.push("/flashcards");
    } catch {
      toast.error("Erro ao criar flashcard(s).");
      setSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
        <ConceptSinglePicker
          arvore={arvore}
          flatConcepts={flatConcepts}
          loadingConcepts={loadingConcepts}
          selectedConceptId={selectedConceptId}
          selectedDisplay={selectedDisplay}
          onSelect={(id) => setSelectedConceptId(id)}
        />

        <NewConceptCard
          arvore={arvore}
          pendingAssuntos={pendingAssuntos}
          onAddConcept={addConcept}
          onAddAssunto={(a) => setPendingAssuntos((prev) => [...prev, a])}
        />

        <ManualTypeSelector tipo={tipo} onSelect={selectType} />

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="px-3 sm:px-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">3</div>
              <div>
                <CardTitle className="text-sm flex items-center gap-1.5"><span>{typeLabel.icon}</span> {typeLabel.label}</CardTitle>
                <CardDescription className="text-[10px]">{typeLabel.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-5 space-y-4">
            <ManualCardForm tipo={tipo} control={form.control} />
          </CardContent>
        </Card>

        {hasContent && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <CardHeader className="px-3 sm:px-5 pb-2">
              <CardTitle className="text-xs flex items-center gap-1.5 text-zinc-500"><EyeIcon className="size-3.5" />Previa do flashcard</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-5 pb-4 space-y-2">
              <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2.5">
                <p className="text-sm font-medium">{card.pergunta}</p>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{card.resposta || <span className="italic text-zinc-300">resposta pendente...</span>}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasSelectedConcept && hasContent && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircleIcon className="size-4 flex-shrink-0" />
            Selecione ou crie um conceito para habilitar o salvamento.
          </div>
        )}

        <Button type="submit" disabled={saving || !hasSelectedConcept} size="lg" className="w-full">
          {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (<><CheckCircle2Icon className="size-4 mr-1" /> Criar flashcard</>)}
        </Button>
      </form>
    </Form>
  );
}
