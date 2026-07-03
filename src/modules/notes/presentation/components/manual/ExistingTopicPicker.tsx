"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, LinkIcon } from "lucide-react";
import { CONCEITO_TO_TOPICO_TYPES } from "../../constants/relation-types";

export interface TopicoGroup {
  assuntoId: string;
  assuntoNome: string;
  topicos: Array<{ id: string; nome: string }>;
}

export interface SelectedTopic {
  id: string;
  tipoRelacao: string;
}

interface ExistingTopicPickerProps {
  groups: TopicoGroup[];
  selected: SelectedTopic[];
  onToggleGroup: (topicoIds: string[], allIn: boolean) => void;
  onToggleTopic: (id: string) => void;
  onUpdateType: (id: string, tipo: string) => void;
  onClear: () => void;
  onLink: () => void;
}

function TopicRow({ topico, sel, onToggle, onType }: {
  topico: { id: string; nome: string };
  sel: SelectedTopic | undefined;
  onToggle: () => void;
  onType: (tipo: string) => void;
}) {
  const isSel = !!sel;
  return (
    <div className="flex items-center gap-2 px-1">
      <button type="button" onClick={onToggle} className="flex-shrink-0">
        <div className={`size-3.5 rounded border flex items-center justify-center ${isSel ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
          {isSel && <CheckCircle2Icon className="size-3 text-white" />}
        </div>
      </button>
      <span className={`text-xs flex-1 truncate ${isSel ? "font-medium" : "text-zinc-500"}`}>{topico.nome}</span>
      {isSel && (
        <select value={sel.tipoRelacao} onChange={(e) => onType(e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
          {CONCEITO_TO_TOPICO_TYPES.map((rt) => (<option key={rt.value} value={rt.value}>{rt.label}</option>))}
        </select>
      )}
    </div>
  );
}

export function ExistingTopicPicker({
  groups, selected, onToggleGroup, onToggleTopic, onUpdateType, onClear, onLink,
}: ExistingTopicPickerProps) {
  const selectedId = (id: string): SelectedTopic | undefined => selected.find((s) => s.id === id);
  return (
    <div className="space-y-2">
      <div className="max-h-44 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
        {groups.map((group) => {
          const ids = group.topicos.map((t) => t.id);
          const allIn = ids.length > 0 && ids.every((id) => !!selectedId(id));
          const selCount = ids.filter((id) => !!selectedId(id)).length;
          return (
            <div key={group.assuntoId} className="px-2 py-1.5">
              <button type="button" onClick={() => onToggleGroup(ids, allIn)} className="flex items-center gap-1 mb-1">
                <div className={`size-3.5 rounded border flex items-center justify-center flex-shrink-0 ${allIn ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{allIn && <CheckCircle2Icon className="size-3 text-white" />}</div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">{group.assuntoNome}</span>
                {selCount > 0 && <span className="text-[10px] text-emerald-500 ml-auto">{selCount}/{ids.length}</span>}
              </button>
              <div className="ml-5 space-y-1">
                {group.topicos.map((t) => (
                  <TopicRow key={t.id} topico={t} sel={selectedId(t.id)} onToggle={() => onToggleTopic(t.id)} onType={(tipo) => onUpdateType(t.id, tipo)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">{selected.length} topico(s)</span>
          <button type="button" onClick={onClear} className="text-[10px] text-red-400 hover:text-red-500">Limpar</button>
        </div>
      )}
      <Button type="button" onClick={onLink} disabled={selected.length === 0} size="sm" className="w-full"><LinkIcon className="size-3 mr-1" />Vincular</Button>
    </div>
  );
}
