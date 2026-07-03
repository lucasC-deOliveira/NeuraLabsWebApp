"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { useRouter } from "@/lib/navigation";
import { contentHttp, notesHttp } from "../../infra/http";
import type { ConceitoArvore, ConceptContext, FlatConcept } from "@/modules/content/domain/concept-tree.types";
import { flattenConceptTree, findTopicName } from "@/modules/content/domain/services/concept-tree";
import {
  syncNotaConceitoRels,
  type NotaConceitoRel, type ConceitoConceitoRel,
  type PendingAssunto, type PendingTopic, type PendingConcept,
} from "../../domain/manual-nota-draft";
import type { SubtipoNota } from "../../domain/nota.types";
import { saveManualNota } from "../../application/use-cases/save-manual-nota";
import type { SubtipoConfigEntry } from "../constants/subtipo-config";
import { SubtipoSelector } from "./manual/SubtipoSelector";
import { NotaDataFields } from "./manual/NotaDataFields";
import { ConceptSelector } from "@/modules/content/presentation/components/ConceptSelector";
import { NotaConceptRelationsCard } from "./manual/NotaConceptRelationsCard";
import { ConceptConceptRelationsCard } from "./manual/ConceptConceptRelationsCard";
import { NewConceptCard } from "@/modules/content/presentation/components/NewConceptCard";
import { PendingConceptsQueue } from "./manual/PendingConceptsQueue";
import { SaveNotaBar } from "./manual/SaveNotaBar";

export function NewNotaManualMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const [subtipo, setSubtipo] = useState<SubtipoNota | null>(null);

  const [arvore, setArvore] = useState<ConceitoArvore[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [flatConcepts, setFlatConcepts] = useState<FlatConcept[]>([]);
  const [conceptMap, setConceptMap] = useState<Map<string, ConceptContext>>(new Map());

  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [notaConceitoRels, setNotaConceitoRels] = useState<NotaConceitoRel[]>([]);
  const [conceitoConceitoRels, setConceitoConceitoRels] = useState<ConceitoConceitoRel[]>([]);
  const [pendingAssuntos, setPendingAssuntos] = useState<PendingAssunto[]>([]);
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [pendingConcepts, setPendingConcepts] = useState<PendingConcept[]>([]);

  useEffect(() => {
    contentHttp
      .getHierarquiaConceitos()
      .then((tree) => {
        const { flat, conceptMap: map } = flattenConceptTree(tree);
        setArvore(tree);
        setFlatConcepts(flat);
        setConceptMap(map);
      })
      .catch(() => { /* keep empty tree */ })
      .finally(() => setLoadingConcepts(false));
  }, []);

  const titleError = titulo.trim().length === 0 && conteudo.trim().length > 0;
  const contentError = conteudo.trim().length === 0 && titulo.trim().length > 0;
  const totalSelected = selectedConcepts.size + pendingConcepts.length;
  const conceptNameOf = (id: string): string => conceptMap.get(id)?.nome || id;
  const topicNameOf = (id: string): string => findTopicName(arvore, id) || id;

  // selectedConcepts is only mutated here, so we sync the note→concept relations
  // in the same handler instead of an effect (avoids set-state-in-effect).
  const toggleConcept = (id: string): void => {
    const next = new Set(selectedConcepts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedConcepts(next);
    setNotaConceitoRels((rels) => syncNotaConceitoRels(rels, Array.from(next)));
  };

  const handleSubtipoToggle = (cfg: SubtipoConfigEntry, selected: boolean): void => {
    setSubtipo(selected ? null : cfg.value);
    if (!selected && !conteudo.trim()) setConteudo(cfg.template);
  };

  const addConcept = (concept: PendingConcept, newTopics: PendingTopic[]): void => {
    setPendingTopics((prev) => {
      const existing = new Set(prev.map((p) => p.tempId));
      return [...prev, ...newTopics.filter((p) => !existing.has(p.tempId))];
    });
    setPendingConcepts((prev) => [...prev, concept]);
  };

  const changeCcRel = (idx: number, patch: Partial<ConceitoConceitoRel>): void =>
    setConceitoConceitoRels((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addCcRel = (): void => {
    const ids = Array.from(selectedConcepts);
    if (ids.length >= 2) setConceitoConceitoRels((prev) => [...prev, { origemId: ids[0], destinoId: ids[1], tipoRelacao: "RELACIONADO" }]);
  };

  const handleSave = async (): Promise<void> => {
    if (!titulo.trim()) { toast.error("Informe o titulo."); return; }
    if (!conteudo.trim()) { toast.error("Informe o conteudo."); return; }
    if (selectedConcepts.size === 0 && pendingConcepts.length === 0) { toast.error("Selecione ou adicione ao menos um conceito."); return; }
    setSaving(true);
    try {
      const { notaId } = await saveManualNota(
        { content: contentHttp, notes: notesHttp },
        {
          titulo, conteudo, subtipo, tree: arvore,
          selectedConceitoIds: Array.from(selectedConcepts),
          notaConceitoRels, conceitoConceitoRels,
          pendingAssuntos, pendingTopics, pendingConcepts,
        },
      );
      toast.success("Nota criada com sucesso!");
      router.push(`/notes/${notaId}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar nota.");
      setSaving(false);
    }
  };

  const showValidationHint = titleError || contentError || (totalSelected === 0 && !!titulo.trim() && !!conteudo.trim());

  return (
    <div className="space-y-5">
      <SubtipoSelector subtipo={subtipo} onToggle={handleSubtipoToggle} />
      <NotaDataFields
        titulo={titulo}
        conteudo={conteudo}
        titleError={titleError}
        contentError={contentError}
        onTitulo={setTitulo}
        onConteudo={setConteudo}
      />
      <ConceptSelector
        arvore={arvore}
        flatConcepts={flatConcepts}
        conceptMap={conceptMap}
        selectedConcepts={selectedConcepts}
        loadingConcepts={loadingConcepts}
        totalSelected={totalSelected}
        onToggleConcept={toggleConcept}
      />

      {selectedConcepts.size > 0 && (
        <NotaConceptRelationsCard
          rels={notaConceitoRels}
          conceptNameOf={conceptNameOf}
          onUpdate={(conceitoId, tipo) => setNotaConceitoRels((prev) => prev.map((r) => (r.conceitoId === conceitoId ? { ...r, tipoRelacao: tipo } : r)))}
        />
      )}

      {selectedConcepts.size >= 2 && (
        <ConceptConceptRelationsCard
          selectedIds={Array.from(selectedConcepts)}
          rels={conceitoConceitoRels}
          conceptNameOf={conceptNameOf}
          onChange={changeCcRel}
          onRemove={(idx) => setConceitoConceitoRels((prev) => prev.filter((_, i) => i !== idx))}
          onAdd={addCcRel}
        />
      )}

      <NewConceptCard
        arvore={arvore}
        pendingAssuntos={pendingAssuntos}
        onAddConcept={addConcept}
        onAddAssunto={(a) => setPendingAssuntos((prev) => [...prev, a])}
      />

      <div className="px-1">
        <PendingConceptsQueue
          pendingConcepts={pendingConcepts}
          pendingTopics={pendingTopics}
          topicNameOf={topicNameOf}
          onRemove={(tempId) => setPendingConcepts((prev) => prev.filter((c) => c.tempId !== tempId))}
        />
      </div>

      {showValidationHint && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          Preencha titulo, conteudo e selecione ao menos um conceito.
        </div>
      )}

      <SaveNotaBar saving={saving} pendingTopics={pendingTopics} pendingConcepts={pendingConcepts} onSave={handleSave} />
    </div>
  );
}
