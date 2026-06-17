"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, NetworkIcon } from "lucide-react";
import type { Community } from "@/lib/graph-communities";
import { TYPE_COLORS } from "@/lib/graph-metrics";

interface CommunitiesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: Community[];
  onCreateDeck: (community: Community) => void;
  onHighlightCommunity: (communityId: string | null) => void;
}

export function CommunitiesPanel({
  open,
  onOpenChange,
  communities,
  onCreateDeck,
  onHighlightCommunity,
}: CommunitiesPanelProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onHighlightCommunity(null); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[80dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <NetworkIcon className="size-4" />
            Comunidades detectadas
          </DialogTitle>
          <DialogDescription>
            Clusters de nós fortemente conectados entre si.
            {communities.length === 0 && " Adicione mais nós e conexões para detectar comunidades."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {communities.map((c) => {
            // Conta tipos de nó no cluster
            const typeCount = new Map<string, number>();
            for (const n of c.nodes) typeCount.set(n.group, (typeCount.get(n.group) ?? 0) + 1);
            const flashcardCount = typeCount.get("FLASHCARD") ?? 0;

            return (
              <div
                key={c.id}
                className="rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                onMouseEnter={() => onHighlightCommunity(c.id)}
                onMouseLeave={() => onHighlightCommunity(null)}
              >
                <div className="flex items-start gap-3">
                  {/* Indicador de cor */}
                  <div
                    className="mt-0.5 size-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight mb-1.5">{c.label}</div>

                    {/* Tags dos tipos presentes */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[...typeCount.entries()].map(([type, count]) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{ borderColor: TYPE_COLORS[type] + "60", color: TYPE_COLORS[type] }}
                        >
                          {count} {type.toLowerCase()}
                        </Badge>
                      ))}
                    </div>

                    {flashcardCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); onCreateDeck(c); }}
                      >
                        <PlusIcon className="size-3" />
                        Criar baralho ({flashcardCount} cards)
                      </Button>
                    )}
                    {flashcardCount === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Sem flashcards neste cluster para criar baralho.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {communities.length > 0 && (
          <>
            <Separator className="my-3 shrink-0" />
            <p className="shrink-0 text-[11px] text-muted-foreground text-center">
              Passe o mouse sobre um cluster para destacá-lo no grafo.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
