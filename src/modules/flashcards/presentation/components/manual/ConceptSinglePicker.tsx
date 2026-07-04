"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { filterFlatConcepts, type ConceitoArvore, type FlatConcept } from "@/modules/content";
import { AssuntoNode, type ExpandKind, type TreeCtx } from "@/modules/content/ui";

interface ConceptSinglePickerProps {
  arvore: ConceitoArvore[];
  flatConcepts: FlatConcept[];
  loadingConcepts: boolean;
  selectedConceptId: string;
  selectedDisplay: string;
  onSelect: (id: string, nome: string) => void;
}

function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string): void {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}

export function ConceptSinglePicker({
  arvore, flatConcepts, loadingConcepts, selectedConceptId, selectedDisplay, onSelect,
}: ConceptSinglePickerProps) {
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

  const selectByName = (id: string): void => {
    const fc = flatConcepts.find((c) => c.id === id);
    onSelect(id, fc?.nome ?? id);
  };

  const ctx: TreeCtx = {
    selected: new Set(selectedConceptId ? [selectedConceptId] : []),
    isExpanded: (kind, id) => stateFor[kind].has(id),
    toggle: (kind, id) => toggleInSet(setterFor[kind], id),
    onToggleConcept: selectByName,
  };

  const filteredFlat = useMemo(() => filterFlatConcepts(flatConcepts, conceptSearch), [flatConcepts, conceptSearch]);

  const pickFlat = (id: string, nome: string): void => {
    onSelect(id, nome);
    setShowFlatList(false);
    setConceptSearch(nome);
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">1</div>
            <div>
              <CardTitle className="text-sm">Conceito</CardTitle>
              <CardDescription className="text-[10px]">Selecione existente ou crie um novo conceito.</CardDescription>
            </div>
          </div>
          {selectedDisplay && (
            <span className="text-[10px] text-primary font-medium truncate max-w-[40%]">✓ {selectedDisplay}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
              <p className="text-xs text-zinc-400 py-3 px-3 text-center">Nenhum conceito encontrado.</p>
            ) : filteredFlat.slice(0, 30).map((fc) => {
              const isSelected = selectedConceptId === fc.id;
              return (
                <button key={fc.id} type="button" className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isSelected ? "bg-primary/[0.04]" : ""}`} onClick={() => pickFlat(fc.id, fc.nome)}>
                  <div className={`size-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {isSelected && <CheckCircle2Icon className="size-2.5 text-primary-foreground" />}
                  </div>
                  <span className="text-xs flex-1 truncate">{fc.nome}</span>
                  <span className="text-[10px] text-zinc-400">{fc.assuntoNome} / {fc.topicoNome}</span>
                </button>
              );
            })}
          </div>
        )}

        {!showFlatList && (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {loadingConcepts ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-6 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando...</div>
            ) : arvore.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">Nenhum conceito disponivel. Crie abaixo.</p>
            ) : arvore.map((assunto) => <AssuntoNode key={assunto.id} assunto={assunto} ctx={ctx} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
