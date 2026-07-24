"use client";

import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { BarChart3Icon, LayersIcon, NetworkIcon, PlayIcon, Trash2Icon, Share2Icon } from "lucide-react";
import type { BaralhoItem } from "../../domain/baralho.types";

interface BaralhoCardProps {
  baralho: BaralhoItem;
  onStudy: () => void;
  onDelete: () => void;
  onAnalytics?: () => void;
  onGraph?: () => void;
}

// As três molduras aninhadas com deslocamento imitam um baralho empilhado — é o
// efeito do app disrupt, onde o cartão é a metáfora central da listagem.
const OUTER_FRAME = "rounded-lg border-2 border-primary/30 pr-1 pb-1 h-full";
const MIDDLE_FRAME = "rounded-lg border-2 border-primary/50 pr-1 pb-1 h-full";
const INNER_FRAME =
  "rounded-lg border-2 border-primary h-full bg-card p-4 flex flex-col transition-colors group-hover:border-primary/70";

function DeckStat({ label, value }: { label: string; value: number }) {
  const muted = value === 0;
  return (
    <div className="flex flex-col items-center justify-center">
      <span className={`text-[10px] uppercase tracking-wide ${muted ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${muted ? "text-muted-foreground/50" : "text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

export function BaralhoCard({ baralho, onStudy, onDelete, onAnalytics, onGraph }: BaralhoCardProps) {
  const empty = baralho.totalCards === 0;
  // preventDefault: os botões vivem dentro do link do cartão.
  const stop = (e: React.MouseEvent, fn: () => void): void => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div className="group">
      <div className={OUTER_FRAME}>
        <div className={MIDDLE_FRAME}>
          <div className={INNER_FRAME}>
            <Link href={`/baralhos/${baralho.id}`} className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                {baralho.origens.length > 0 && (
                  <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <NetworkIcon className="size-2.5 shrink-0" />
                    <span className="truncate">{baralho.origens.map((o) => o.nome).join(", ")}</span>
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Cartões {baralho.totalCards}
                </span>
              </div>

              <div className="my-4 flex h-28 items-center justify-center rounded-md border-2 border-primary/20 bg-primary/5">
                <LayersIcon className="size-12 text-primary/40 transition-transform group-hover:scale-110" />
              </div>

              <h3 className="line-clamp-2 text-center text-lg font-bold leading-tight text-primary">
                {baralho.titulo}
              </h3>

              <div className="mt-auto flex w-full justify-around gap-2 pt-4">
                <DeckStat label="Novos" value={baralho.novos} />
                <DeckStat label="Aprender" value={baralho.aprender} />
                <DeckStat label="Revisar" value={baralho.revisar} />
              </div>
            </Link>

            <div className="mt-3 flex items-center justify-between gap-1 border-t border-primary/10 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={empty}
                title={empty ? "Baralho sem cartões" : "Estudar este baralho"}
                onClick={(e) => stop(e, onStudy)}
              >
                <PlayIcon className="size-3.5 mr-1" />
                Estudar
              </Button>
              <div className="flex items-center gap-1">
                {onGraph && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 opacity-40 transition-opacity hover:text-primary group-hover:opacity-100"
                    title="Ver mini-grafo"
                    onClick={(e) => stop(e, onGraph)}
                  >
                    <Share2Icon className="size-3.5" />
                  </Button>
                )}
                {onAnalytics && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 opacity-40 transition-opacity hover:text-primary group-hover:opacity-100"
                    title="Ver analytics"
                    onClick={(e) => stop(e, onAnalytics)}
                  >
                    <BarChart3Icon className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 opacity-40 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  title="Remover baralho"
                  onClick={(e) => stop(e, onDelete)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
