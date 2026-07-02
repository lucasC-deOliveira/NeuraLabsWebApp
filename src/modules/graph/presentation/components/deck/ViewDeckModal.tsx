import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2Icon, ChevronRightIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { DeckStudyCard, DeckForStudy } from "@/modules/graph/application/ports/graph-deck.port";
import { MarkdownContent } from "@/components/markdown-content";
import { isDesktop } from "@/lib/vault-bridge";
import { readAllVaultNodes } from "@/lib/vault-sync";

interface ViewDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

async function loadDeckFromVault(
  baralhoId: string,
  grafoId?: string,
  grafoNome?: string,
): Promise<DeckForStudy | null> {
  if (!isDesktop() || !grafoId || !grafoNome) return null;
  const nodes = await readAllVaultNodes(grafoId, grafoNome);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const baralho = nodeById.get(baralhoId);
  if (!baralho || baralho.tipo !== "BARALHO") return null;

  const cards: DeckStudyCard[] = baralho.relacoes
    .filter((r) => r.rel === "CONTEM")
    .map((r) => {
      const fc = nodeById.get(r.alvo);
      if (!fc || fc.tipo !== "FLASHCARD") return null;
      return { id: fc.id, pergunta: fc.pergunta ?? "", resposta: fc.resposta ?? "", conceito: null };
    })
    .filter(Boolean) as DeckStudyCard[];

  return { titulo: baralho.titulo ?? baralho.nome ?? "Baralho", cards };
}

async function loadDeckFromBackend(baralhoId: string): Promise<DeckForStudy | null> {
  try {
    const deck = await graphHttp.getDeckForStudy(baralhoId);
    if (deck) return deck;
  } catch { /* não encontrado */ }
  return null;
}

// Not `async` so the backend fetch is issued synchronously in the non-desktop path
// (an extra `await` on the vault check would defer getDeckForStudy by a microtask).
// Desktop uses the vault as primary source (avoids join-table issues in the backend).
function loadDeck(baralhoId: string, grafoId?: string, grafoNome?: string): Promise<DeckForStudy | null> {
  if (isDesktop() && grafoId && grafoNome) {
    return loadDeckFromVault(baralhoId, grafoId, grafoNome).then((v) => v ?? loadDeckFromBackend(baralhoId));
  }
  return loadDeckFromBackend(baralhoId);
}

export function ViewDeckModal({ open, onOpenChange, baralhoId, grafoId, grafoNome }: ViewDeckModalProps) {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [cards, setCards] = useState<DeckStudyCard[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [prevKey, setPrevKey] = useState("");

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && baralhoId ? baralhoId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setCards([]); setExpanded(new Set()); }
  }

  useEffect(() => {
    if (!open || !baralhoId) return;
    let active = true;
    loadDeck(baralhoId, grafoId, grafoNome)
      .then((res): void => {
        if (!active) return;
        setTitulo(res?.titulo ?? "");
        setCards(res?.cards ?? []);
      })
      .catch((): void => { if (active) setCards([]); })
      .finally((): void => { if (active) setLoading(false); });
    return (): void => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baralhoId]);

  const toggle = (id: string): void =>
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
              {cards.map((card) => (
                <DeckCard key={card.id} card={card} isOpen={expanded.has(card.id)} onToggle={() => toggle(card.id)} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeckCard({ card, isOpen, onToggle }: { card: DeckStudyCard; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border bg-card">
      <button onClick={onToggle} className="flex w-full items-start gap-2 p-3 text-left">
        <ChevronRightIcon
          className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${isOpen ? "" : "line-clamp-2"}`}>
            {isOpen ? (
              <MarkdownContent>{card.pergunta}</MarkdownContent>
            ) : (
              card.pergunta.replace(/[#*_`>-]/g, "").trim()
            )}
          </div>
          {card.conceito && <div className="mt-0.5 truncate text-xs text-muted-foreground">{card.conceito}</div>}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-primary/20 bg-muted/40 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Resposta</span>
          <div className="mt-1 text-sm">
            <MarkdownContent>{card.resposta}</MarkdownContent>
          </div>
        </div>
      )}
    </div>
  );
}
