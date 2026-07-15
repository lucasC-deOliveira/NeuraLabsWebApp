"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import type { BaralhoCard } from "../../domain/baralho.types";

interface BaralhoCardRowProps {
  card: BaralhoCard;
  onRemove: () => void;
}

export function BaralhoCardRow({ card, onRemove }: BaralhoCardRowProps) {
  return (
    <Card className="group">
      <CardContent className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug line-clamp-2">{card.pergunta}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{card.resposta}</p>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {card.conceito && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{card.conceito}</Badge>
            )}
            {card.tipo && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium text-primary/80">
                {card.tipo.replace("_", " ").toLowerCase()}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0 text-zinc-400 hover:text-red-500 opacity-40 group-hover:opacity-100 transition-opacity"
          title="Remover do baralho (o flashcard continua existindo)"
          onClick={onRemove}
        >
          <XIcon className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
