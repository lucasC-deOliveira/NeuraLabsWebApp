"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircleIcon, PlusIcon, XIcon } from "lucide-react";
import type { ConceitoArvore } from "../../../domain/concept-tree.types";
import { getTopicosForAssunto, findTopicName } from "../../../domain/services/concept-tree";
import {
  buildPendingConcept, type StagedRelation, type PendingConcept, type PendingTopic, type PendingAssunto,
} from "../../../domain/manual-nota-draft";
import { nextTempId } from "../../temp-id";
import { ExistingTopicPicker, type SelectedTopic } from "./ExistingTopicPicker";
import { NewTopicPicker, type SelectedAssunto } from "./NewTopicPicker";

interface NewConceptCardProps {
  arvore: ConceitoArvore[];
  pendingAssuntos: PendingAssunto[];
  onAddConcept: (concept: PendingConcept, newTopics: PendingTopic[]) => void;
  onAddAssunto: (assunto: PendingAssunto) => void;
}

function StagedRelationsList({ staged, onRemove }: { staged: StagedRelation[]; onRemove: (idx: number) => void }) {
  if (staged.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500">Relacoes do conceito:</Label>
      {staged.map((r, idx) => (
        <div key={idx} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-xs">
          <Badge variant="outline" className="text-[10px] h-5 px-1 flex-shrink-0">{r.tipoRelacao}</Badge>
          {r.kind === "existing-topic" ? (
            <span>Topico: <b>{r.topicNome}</b></span>
          ) : (
            <span>Novo topico: <b>{r.topicNome}</b> <span className="text-zinc-400">({r.targetAssuntoNomes.join(", ")})</span></span>
          )}
          <button type="button" onClick={() => onRemove(idx)} className="ml-auto text-zinc-400 hover:text-red-500"><XIcon className="size-3" /></button>
        </div>
      ))}
    </div>
  );
}

export function NewConceptCard({ arvore, pendingAssuntos, onAddConcept, onAddAssunto }: NewConceptCardProps) {
  const seqRef = useRef(0);
  const seq = (): number => ++seqRef.current;

  const [newConceitoNome, setNewConceitoNome] = useState("");
  const [relationMode, setRelationMode] = useState<"existing" | "new">("existing");
  const [staged, setStaged] = useState<StagedRelation[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([]);
  const [newTopicNome, setNewTopicNome] = useState("");
  const [newTopicAssuntos, setNewTopicAssuntos] = useState<SelectedAssunto[]>([]);
  const [newAssuntoNome, setNewAssuntoNome] = useState("");

  const existingGroups = useMemo(
    () => arvore.map((a) => ({ assuntoId: a.id, assuntoNome: a.nome, topicos: getTopicosForAssunto(arvore, a.id) })).filter((g) => g.topicos.length > 0),
    [arvore],
  );

  const toggleTopic = (id: string): void =>
    setSelectedTopics((prev) => (prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : [...prev, { id, tipoRelacao: "FUNDAMENTA" }]));

  const toggleGroup = (ids: string[], allIn: boolean): void =>
    setSelectedTopics((prev) =>
      allIn ? prev.filter((s) => !ids.includes(s.id)) : [...prev, ...ids.map((id) => ({ id, tipoRelacao: "FUNDAMENTA" }))]);

  const addExistingRelations = (): void => {
    if (selectedTopics.length === 0) return;
    const rels: StagedRelation[] = selectedTopics.map((item) => ({
      kind: "existing-topic", topicId: item.id, topicNome: findTopicName(arvore, item.id), tipoRelacao: item.tipoRelacao,
    }));
    setStaged((prev) => [...prev, ...rels]);
    setSelectedTopics([]);
  };

  const toggleNewTopicAssunto = (id: string, nome: string): void =>
    setNewTopicAssuntos((prev) => (prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : [...prev, { id, nome, tipoRelacao: "PERTENCE_A" }]));

  const addNewTopicRelation = (): void => {
    if (!newTopicNome.trim() || newTopicAssuntos.length === 0) return;
    setStaged((prev) => [...prev, {
      kind: "new-topic",
      topicTempId: nextTempId("pt", seq()),
      topicNome: newTopicNome.trim(),
      tipoRelacao: newTopicAssuntos.map((a) => a.tipoRelacao).join(", "),
      targetAssuntoIds: newTopicAssuntos.map((a) => a.id),
      targetAssuntoNomes: newTopicAssuntos.map((a) => a.nome),
    }]);
    setNewTopicNome("");
    setNewTopicAssuntos([]);
  };

  const addPendingAssunto = (): void => {
    if (!newAssuntoNome.trim()) return;
    onAddAssunto({ tempId: nextTempId("passunto", seq()), nome: newAssuntoNome.trim() });
    setNewAssuntoNome("");
  };

  const addConceptToQueue = (): void => {
    if (!newConceitoNome.trim() || staged.length === 0) return;
    const { concept, newTopics } = buildPendingConcept(newConceitoNome.trim(), staged, nextTempId("pc", seq()));
    onAddConcept(concept, newTopics);
    setNewConceitoNome("");
    setStaged([]);
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center gap-2">
          <PlusCircleIcon className="size-4 text-zinc-400" />
          <div>
            <CardTitle className="text-sm">Criar novo conceito</CardTitle>
            <CardDescription className="text-[10px]">Defina o conceito e vincule a topicos existentes ou novos.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-3">
        <div className="space-y-2">
          <Label>Nome do conceito</Label>
          <Input value={newConceitoNome} onChange={(e) => setNewConceitoNome(e.target.value)} placeholder="Ex: Principio da Legalidade" className="h-9" />
        </div>

        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 w-fit">
          <button type="button" onClick={() => setRelationMode("existing")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${relationMode === "existing" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>Topico existente</button>
          <button type="button" onClick={() => setRelationMode("new")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${relationMode === "new" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>Novo topico</button>
        </div>

        {relationMode === "existing" ? (
          <ExistingTopicPicker
            groups={existingGroups}
            selected={selectedTopics}
            onToggleGroup={toggleGroup}
            onToggleTopic={toggleTopic}
            onUpdateType={(id, tipo) => setSelectedTopics((prev) => prev.map((s) => (s.id === id ? { ...s, tipoRelacao: tipo } : s)))}
            onClear={() => setSelectedTopics([])}
            onLink={addExistingRelations}
          />
        ) : (
          <NewTopicPicker
            arvore={arvore}
            pendingAssuntos={pendingAssuntos}
            newTopicNome={newTopicNome}
            selectedAssuntos={newTopicAssuntos}
            newAssuntoNome={newAssuntoNome}
            onTopicNome={setNewTopicNome}
            onToggleAssunto={toggleNewTopicAssunto}
            onUpdateAssuntoType={(id, tipo) => setNewTopicAssuntos((prev) => prev.map((s) => (s.id === id ? { ...s, tipoRelacao: tipo } : s)))}
            onNewAssuntoNome={setNewAssuntoNome}
            onAddAssunto={addPendingAssunto}
            onLink={addNewTopicRelation}
          />
        )}

        <StagedRelationsList staged={staged} onRemove={(idx) => setStaged((prev) => prev.filter((_, i) => i !== idx))} />

        <Button onClick={addConceptToQueue} disabled={!newConceitoNome.trim() || staged.length === 0} size="sm" className="w-full"><PlusIcon className="size-3.5 mr-1" />Adicionar conceito a fila</Button>
      </CardContent>
    </Card>
  );
}
