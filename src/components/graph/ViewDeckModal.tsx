"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2Icon, ChevronRightIcon } from "lucide-react";
import { getDeckForStudy } from "@/lib/graph-api";
import { MarkdownContent } from "@/components/markdown-content";

interface ViewDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
}

type Card = { id: string; pergunta: string; resposta: string; conceito: string | null };

export function ViewDeckModal({ open, onOpenChange, baralhoId }: ViewDeckModalProps) {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !baralhoId) return;
    let active = true;
    setLoading(true);
    setCards([]);
    setExpanded(new Set());
    getDeckForStudy(baralhoId)
      .then((deck) => {
        if (!active) return;
        if (deck) {
          setTitulo(deck.titulo);
          setCards(deck.cards);
        } else {
          setTitulo("");
          setCards([]);
        }
      })
      .catch(() => active && setCards([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, baralhoId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{titulo || "Baralho"}</DialogTitle>
          <DialogDescription>
            {cards.length === 1 ? "1 flashcard" : `${cards.length} flashcards`} — clique para ver o conteúdo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Carregando...
            </div>
          ) : cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Este baralho não tem flashcards.
            </p>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => {
                const isOpen = expanded.has(card.id);
                return (
                  <div key={card.id} className="rounded-lg border bg-card">
                    <button
                      onClick={() => toggle(card.id)}
                      className="flex w-full items-start gap-2 p-3 text-left"
                    >
                      <ChevronRightIcon
                        className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium ${isOpen ? "" : "line-clamp-2"}`}>
                          {isOpen ? (
                            <MarkdownContent>{card.pergunta}</MarkdownContent>
                          ) : (
                            card.pergunta.replace(/[#*_`>-]/g, "").trim()
                          )}
                        </div>
                        {card.conceito && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{card.conceito}</div>
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-primary/20 bg-muted/40 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Resposta
                        </span>
                        <div className="mt-1 text-sm">
                          <MarkdownContent>{card.resposta}</MarkdownContent>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
