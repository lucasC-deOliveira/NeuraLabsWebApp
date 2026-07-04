"use client";

import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, Loader2Icon, BrainIcon, Trash2Icon, LayersIcon } from "lucide-react";
import type { NotaListItem } from "../../domain/nota.types";
import { formatFullDate, formatSubtipoLabel } from "../../domain/services/nota-format";

interface NoteCardProps {
  nota: NotaListItem;
  generating: boolean;
  onGenerate: () => void;
  onDelete: () => void;
}

function ConceptBadges({ conceitos }: { conceitos: NotaListItem["conceitosRelacionados"] }) {
  if (conceitos.length === 0) return null;
  return (
    <span className="text-[10px] text-zinc-400 mr-0.5 flex items-center gap-1">
      <LayersIcon className="size-3" />
      {conceitos.slice(0, 4).map((c) => (
        <Badge key={c.id} variant="outline" className="text-[10px] h-5 px-1">{c.nome}</Badge>
      ))}
      {conceitos.length > 4 && <span className="text-[10px] text-zinc-400">+{conceitos.length - 4}</span>}
    </span>
  );
}

export function NoteCard({ nota, generating, onGenerate, onDelete }: NoteCardProps) {
  const stop = (e: React.MouseEvent, fn: () => void): void => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <Link href={`/notes/${nota.id}`}>
        <div className="px-3 sm:px-6 pt-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium line-clamp-1 truncate">{nota.titulo}</h3>
                <span className="text-[10px] font-medium flex-shrink-0 text-zinc-400">
                  {formatFullDate(nota.dataCriacao)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                {nota.preview}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {nota.subtipo && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-violet-600 border-violet-300 dark:border-violet-700 dark:text-violet-400">
                {formatSubtipoLabel(nota.subtipo)}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
              {nota.wordCount} palavras
            </Badge>
            {nota.flashcardCount > 0 ? (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5">
                <BrainIcon className="size-3" />{nota.flashcardCount}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-emerald-500 border-emerald-300 dark:border-emerald-700">
                Sem FC
              </Badge>
            )}
            <ConceptBadges conceitos={nota.conceitosRelacionados} />
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              Abrir <ArrowRightIcon className="size-3" />
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
              onClick={(e) => stop(e, onGenerate)}
              disabled={generating}
            >
              {generating ? <Loader2Icon className="size-3.5 mr-1 animate-spin" /> : <BrainIcon className="size-3.5 mr-1" />}
              <span className="hidden sm:inline">Gerar FC</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-red-400 hover:text-red-500"
              onClick={(e) => stop(e, onDelete)}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
}
