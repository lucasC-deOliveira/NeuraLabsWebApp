"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2Icon, LinkIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConceitoArvore } from "../../../domain/concept-tree.types";
import type { PendingAssunto } from "../../../domain/manual-nota-draft";

export interface SelectedAssunto {
  id: string;
  nome: string;
  tipoRelacao: string;
}

interface NewTopicPickerProps {
  arvore: ConceitoArvore[];
  pendingAssuntos: PendingAssunto[];
  newTopicNome: string;
  selectedAssuntos: SelectedAssunto[];
  newAssuntoNome: string;
  onTopicNome: (v: string) => void;
  onToggleAssunto: (id: string, nome: string) => void;
  onUpdateAssuntoType: (id: string, tipo: string) => void;
  onNewAssuntoNome: (v: string) => void;
  onAddAssunto: () => void;
  onLink: () => void;
}

function AssuntoRow({ nome, sel, isPending, onToggle, onType }: {
  nome: string; sel: SelectedAssunto | undefined; isPending: boolean;
  onToggle: () => void; onType: (tipo: string) => void;
}) {
  const isSel = !!sel;
  const boxCls = isPending
    ? (isSel ? "bg-emerald-100 border-emerald-400 text-emerald-600" : "border-zinc-300 dark:border-zinc-600")
    : (isSel ? "bg-primary/10 border-primary text-primary" : "border-zinc-300 dark:border-zinc-600");
  return (
    <div className="flex items-center gap-2 py-1 px-2">
      <button type="button" onClick={onToggle} className="flex-shrink-0">
        <div className={`size-3.5 rounded border flex items-center justify-center ${boxCls}`}>{isSel && <CheckCircle2Icon className="size-3" />}</div>
      </button>
      <span className={`text-xs flex-1 ${isSel && !isPending ? "font-medium" : ""}`}>{nome}</span>
      {isPending && <Badge variant="outline" className="text-[8px] h-3.5 px-0.5 text-emerald-500 border-emerald-300 flex-shrink-0">nova</Badge>}
      {isSel && !isPending && (
        <select value={sel.tipoRelacao} onChange={(e) => onType(e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
          <option value="PERTENCE_A">PERTENCE_A</option>
          <option value="APLICADO_EM">APLICADO_EM</option>
        </select>
      )}
    </div>
  );
}

export function NewTopicPicker({
  arvore, pendingAssuntos, newTopicNome, selectedAssuntos, newAssuntoNome,
  onTopicNome, onToggleAssunto, onUpdateAssuntoType, onNewAssuntoNome, onAddAssunto, onLink,
}: NewTopicPickerProps) {
  const selById = (id: string): SelectedAssunto | undefined => selectedAssuntos.find((s) => s.id === id);
  const canLink = !!newTopicNome.trim() && selectedAssuntos.length > 0;
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-400">Nome do novo topico</Label>
        <Input value={newTopicNome} onChange={(e) => onTopicNome(e.target.value)} placeholder="Ex: Direito Constitucional" className="h-8" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] text-zinc-400">Vincular a materias</Label>
        <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
          {arvore.map((a) => (
            <AssuntoRow key={a.id} nome={a.nome} sel={selById(a.id)} isPending={false} onToggle={() => onToggleAssunto(a.id, a.nome)} onType={(tipo) => onUpdateAssuntoType(a.id, tipo)} />
          ))}
          {pendingAssuntos.map((pa) => (
            <AssuntoRow key={pa.tempId} nome={pa.nome} sel={selById(pa.tempId)} isPending onToggle={() => onToggleAssunto(pa.tempId, pa.nome)} onType={() => {}} />
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <Input
            value={newAssuntoNome}
            onChange={(e) => onNewAssuntoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newAssuntoNome.trim()) onAddAssunto(); }}
            placeholder="Nova materia"
            className="h-8 flex-1"
          />
          <Button type="button" onClick={onAddAssunto} disabled={!newAssuntoNome.trim()} size="sm" className="h-8"><PlusIcon className="size-3 mr-1" />Materia</Button>
        </div>
      </div>
      <Button type="button" onClick={onLink} disabled={!canLink} size="sm" className="w-full"><LinkIcon className="size-3 mr-1" />Vincular</Button>
    </div>
  );
}
