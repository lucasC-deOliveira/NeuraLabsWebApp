"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, CheckCircle2Icon, Loader2Icon, XIcon } from "lucide-react";
import type { ConceitoArvore, ConceptContext } from "../../../domain/concept-tree.types";
import { filterFlatConcepts } from "../../../domain/services/concept-tree";
import type { FlatConcept } from "../../../domain/concept-tree.types";
import { AssuntoNode, type ExpandKind, type TreeCtx } from "./ConceptTree";

interface ConceptSelectorProps {
  arvore: ConceitoArvore[];
  flatConcepts: FlatConcept[];
  conceptMap: Map<string, ConceptContext>;
  selectedConcepts: Set<string>;
  loadingConcepts: boolean;
  totalSelected: number;
  onToggleConcept: (id: string) => void;
}

function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string): void {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}

export function ConceptSelector({
  arvore, flatConcepts, conceptMap, selectedConcepts, loadingConcepts, totalSelected, onToggleConcept,
}: ConceptSelectorProps) {
  const [conceptSearch, setConceptSearch] = useState("");
  const [showFlatList, setShowFlatList] = useState(false);
  const [assuntoSet, setAssuntoSet] = useState<Set<string>>(new Set());
  const [relAssuntoSet, setRelAssuntoSet] = useState<Set<string>>(new Set());
  const [topicoSet, setTopicoSet] = useState<Set<string>>(new Set());
  const [relTopicoSet, setRelTopicoSet] = useState<Set<string>>(new Set());

  const setterFor: Record<ExpandKind, React.Dispatch<React.SetStateAction<Set<string>>>> = {
    assunto: setAssuntoSet, relAssunto: setRelAssuntoSet, topico: setTopicoSet, relTopico: setRelTopicoSet,
  };
  const stateFor: Record<ExpandKind, Set<string>> = {
    assunto: assuntoSet, relAssunto: relAssuntoSet, topico: topicoSet, relTopico: relTopicoSet,
  };

  const ctx: TreeCtx = {
    selected: selectedConcepts,
    isExpanded: (kind, id) => stateFor[kind].has(id),
    toggle: (kind, id) => toggleInSet(setterFor[kind], id),
    onToggleConcept,
  };

  const filteredFlat = useMemo(() => filterFlatConcepts(flatConcepts, conceptSearch), [flatConcepts, conceptSearch]);

  const pickFlat = (id: string): void => { onToggleConcept(id); setShowFlatList(false); setConceptSearch(""); };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">3</div>
            <div>
              <CardTitle className="text-sm">Conceitos</CardTitle>
              <CardDescription className="text-[10px]">Selecione existentes ou crie novos abaixo.</CardDescription>
            </div>
          </div>
          {totalSelected > 0 && <Badge className="text-xs">{totalSelected}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Buscar conceito, topico ou materia..."
            className="pl-9 h-9 text-sm"
            value={conceptSearch}
            onChange={(e) => { setConceptSearch(e.target.value); setShowFlatList(e.target.value.length > 0); }}
            onFocus={() => setShowFlatList(conceptSearch.length > 0)}
          />
        </div>

        {showFlatList && (
          <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredFlat.length === 0 ? (
              <p className="text-xs text-zinc-400 py-3 text-center">Nenhum conceito encontrado.</p>
            ) : filteredFlat.slice(0, 30).map((fc) => {
              const sel = selectedConcepts.has(fc.id);
              return (
                <button key={fc.id} type="button" className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${sel ? "bg-primary/[0.04]" : ""}`} onClick={() => pickFlat(fc.id)}>
                  <div className={`size-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${sel ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{sel && <CheckCircle2Icon className="size-2.5 text-primary-foreground" />}</div>
                  <span className="text-xs flex-1 truncate">{fc.nome}</span>
                  <span className="text-[10px] text-zinc-400">{fc.assuntoNome} / {fc.topicoNome}</span>
                </button>
              );
            })}
          </div>
        )}

        {!showFlatList && (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {loadingConcepts ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-6 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando...</div>
            ) : flatConcepts.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">Nenhum conceito disponivel.</p>
            ) : arvore.map((assunto) => <AssuntoNode key={assunto.id} assunto={assunto} ctx={ctx} />)}
          </div>
        )}

        {selectedConcepts.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedConcepts).map((id) => (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1 px-1.5 h-6">
                {conceptMap.get(id)?.nome || id}
                <button type="button" onClick={() => onToggleConcept(id)}><XIcon className="size-3 ml-0.5" /></button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
