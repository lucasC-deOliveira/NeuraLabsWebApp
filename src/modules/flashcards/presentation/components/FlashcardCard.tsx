"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PencilIcon, Trash2Icon, CalendarDaysIcon } from "lucide-react";
import type { FlashcardItem, SpacedRepetition } from "../../domain/flashcard.types";
import type { FlashcardCriteria } from "../../domain/services/flashcard-filters";
import { formatDistanceToNow, isOverdue, isDue, getEaseBar } from "../../domain/services/srs-status";
import { ESTAGIO_LABELS, ESTAGIO_STYLES, truncate } from "../constants/estagio";
import { ConceptTags, type ConceptTagSelection } from "@/components/concept-tags";

// Traduz o clique numa tag para o filtro desta lista: o chip compartilhado só avisa
// o que foi clicado, sem conhecer os critérios de flashcards.
function selectionToCriteria(selection: ConceptTagSelection): Partial<FlashcardCriteria> {
  if (selection.topicoId) {
    return { assuntoFilter: selection.assuntoId ?? "", topicoFilter: selection.topicoId };
  }
  if (selection.assuntoId) return { assuntoFilter: selection.assuntoId, topicoFilter: "" };
  return { search: selection.conceito ?? "" };
}

function DueBadge({ sr }: { sr: SpacedRepetition | null }) {
  if (!sr) return <Badge variant="outline" className="text-[10px] h-5 px-1.5">Sem revisao</Badge>;
  const info = formatDistanceToNow(new Date(sr.proximaRevisao));
  if (isOverdue(sr)) return <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{info.text}</Badge>;
  if (isDue(sr)) return <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{info.text}</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5 px-1.5">{info.text}</Badge>;
}

function EaseBar({ sr }: { sr: SpacedRepetition }) {
  const color = sr.dificuldade <= 2 ? "bg-emerald-400" : sr.dificuldade <= 3 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1">
      <span className="flex items-center gap-0.5">D</span>
      {getEaseBar(Math.max(1, Math.min(5, 6 - sr.dificuldade))).map((filled, i) => (
        <div key={i} className={`w-1.5 h-2 rounded-sm ${filled ? color : "bg-zinc-200 dark:bg-zinc-700"}`} />
      ))}
    </div>
  );
}

interface FlashcardCardProps {
  fc: FlashcardItem;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFilter: (patch: Partial<FlashcardCriteria>) => void;
}

export function FlashcardCard({ fc, onDetail, onEdit, onDelete, onFilter }: FlashcardCardProps) {
  const sr = fc.spacedRepetition;
  const stage = sr?.estagioAprendizado;
  const stageStyle = stage && stage > 0 ? ESTAGIO_STYLES[stage] : null;
  const stop = (e: React.MouseEvent, fn: () => void): void => { e.stopPropagation(); fn(); };
  // Conceitos conectados no grafo; fora de grafos, cai no conceito base do flashcard.
  const conceptTags = fc.conceitosConectados.length > 0
    ? fc.conceitosConectados
    : [{ conceito: fc.conceito, topico: fc.topico, topicoId: fc.topicoId, assunto: fc.assunto, assuntoId: fc.assuntoId }];

  return (
    <Card className="group flex flex-col transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer">
      <CardContent className="flex-1 px-4 pt-4 pb-2 space-y-2.5" onClick={onDetail}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ConceptTags tags={conceptTags} onSelect={(s) => onFilter(selectionToCriteria(s))} />
          {fc.tipo && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium text-primary/80">
              {fc.tipo.replace("_", " ").toLowerCase()}
            </Badge>
          )}
        </div>

        <div>
          <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{truncate(fc.pergunta, 150)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{truncate(fc.resposta, 160)}</p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-1.5">
          <DueBadge sr={sr} />
          {stage !== undefined && stage > 0 && stageStyle && (
            <div className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ring-1 ring-inset ${stageStyle}`}>
              {ESTAGIO_LABELS[stage]}
            </div>
          )}
        </div>

        {sr && (
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <EaseBar sr={sr} />
            <div className="flex items-center gap-1">
              <CalendarDaysIcon className="size-3" />
              <span>{sr.intervalo}d</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 pb-3 pt-0 justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => stop(e, onEdit)} title="Editar">
          <PencilIcon className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500" onClick={(e) => stop(e, onDelete)} title="Remover">
          <Trash2Icon className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
