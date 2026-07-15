"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { ConceptTags, type ConceptTagSelection } from "@/components/concept-tags";
import type { BaralhoCard } from "../../domain/baralho.types";
import { formatTipoLabel } from "../../domain/services/baralho-card-filters";

interface BaralhoCardRowProps {
  card: BaralhoCard;
  onRemove: () => void;
  onSelectTag: (selection: ConceptTagSelection) => void;
}

export function BaralhoCardRow({ card, onRemove, onSelectTag }: BaralhoCardRowProps) {
  // Conceitos conectados no grafo; fora de grafos, cai no conceito base do cartão.
  const tags =
    card.conceitosConectados.length > 0
      ? card.conceitosConectados
      : [{ conceito: card.conceito, topico: "", topicoId: "", assunto: "", assuntoId: "" }];

  return (
    <Card className="group">
      <CardContent className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug line-clamp-2">{card.pergunta}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{card.resposta}</p>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <ConceptTags tags={tags} onSelect={onSelectTag} />
            {card.tipo && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium text-primary/80 capitalize">
                {formatTipoLabel(card.tipo)}
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
