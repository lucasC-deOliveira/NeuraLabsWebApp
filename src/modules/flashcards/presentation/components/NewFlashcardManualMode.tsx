"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { useRouter } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircle2Icon, EyeIcon, AlertCircleIcon } from "lucide-react";
import {
  flattenConceptTree,
  type ConceitoArvore, type FlatConcept,
  type PendingAssunto, type PendingTopic, type PendingConcept,
} from "@/modules/content";
import { NewConceptCard } from "@/modules/content/ui";
import { contentHttp, flashcardsHttp } from "../../infra/http";
import {
  buildManualCard, validateManualFields, EMPTY_MANUAL_FIELDS,
  type ManualCardType, type ManualCardFields,
} from "../../domain/manual-card";
import { saveManualFlashcard } from "../../application/use-cases/save-manual-flashcard";
import { MANUAL_TYPES } from "../constants/manual-types";
import { ManualTypeSelector } from "./manual/ManualTypeSelector";
import { ManualCardForm } from "./manual/ManualCardForm";
import { ConceptSinglePicker } from "./manual/ConceptSinglePicker";

const PENDING_PREFIX = "pending:";

export function NewFlashcardManualMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tipo, setTipo] = useState<ManualCardType>("DEFINICAO");
  const [fields, setFields] = useState<ManualCardFields>(EMPTY_MANUAL_FIELDS);
  const [saving, setSaving] = useState(false);

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

  const patch = (p: Partial<ManualCardFields>): void => setFields((prev) => ({ ...prev, ...p }));

  const card = buildManualCard(tipo, fields);
  const errors = validateManualFields(tipo, fields);
  const hasContent = !!card.pergunta.trim();
  const hasAllAnswers = !!card.resposta.trim();
  const hasSelectedConcept = !!selectedConceptId;
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

  const handleSave = async (): Promise<void> => {
    if (!hasSelectedConcept) { toast.error("Selecione ou adicione um conceito."); return; }
    if (!hasContent) { toast.error("Preencha os campos obrigatorios."); return; }
    if (!hasAllAnswers) { toast.error("Preencha todas as respostas."); return; }
    setSaving(true);
    try {
      await saveManualFlashcard(
        { content: contentHttp, flashcards: flashcardsHttp },
        { selectedConceptId, tipo, card, staged: { tree: arvore, pendingAssuntos, pendingTopics, pendingConcepts } },
      );
      toast.success("Flashcard criado!");
      router.push("/flashcards");
    } catch {
      toast.error("Erro ao criar flashcard(s).");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
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

      <ManualTypeSelector tipo={tipo} onSelect={setTipo} />

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
          <ManualCardForm tipo={tipo} fields={fields} errors={errors} patch={patch} />
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

      <Button onClick={handleSave} disabled={saving || !hasSelectedConcept || !hasContent || !hasAllAnswers} size="lg" className="w-full">
        {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (<><CheckCircle2Icon className="size-4 mr-1" /> Criar flashcard</>)}
      </Button>
    </div>
  );
}
