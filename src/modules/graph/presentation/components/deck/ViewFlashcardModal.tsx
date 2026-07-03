import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2Icon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { isDesktop } from "@/lib/vault-bridge";
import { findVaultNode } from "@/lib/vault-sync";

interface ViewFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

interface FlashcardData {
  pergunta: string;
  resposta: string;
}

async function loadFromVault(flashcardId: string, grafoId?: string, grafoNome?: string): Promise<FlashcardData | null> {
  if (!isDesktop() || !grafoId || !grafoNome) return null;
  const vn = await findVaultNode(grafoId, grafoNome, flashcardId, "FLASHCARD");
  if (!vn) return null;
  return { pergunta: vn.pergunta ?? "", resposta: vn.resposta ?? "" };
}

async function loadFromBackend(flashcardId: string): Promise<FlashcardData | null> {
  try {
    const d = await graphHttp.getNodeDetails("FLASHCARD", flashcardId);
    if (d) return { pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" };
  } catch { /* não encontrado */ }
  return null;
}

// Not `async` so the backend fetch is issued synchronously in the non-desktop path
// (an extra `await` on the vault check would defer getNodeDetails by a microtask).
function loadFlashcard(flashcardId: string, grafoId?: string, grafoNome?: string): Promise<FlashcardData | null> {
  if (isDesktop() && grafoId && grafoNome) {
    return loadFromVault(flashcardId, grafoId, grafoNome).then((v) => v ?? loadFromBackend(flashcardId));
  }
  return loadFromBackend(flashcardId);
}

export function ViewFlashcardModal({ open, onOpenChange, flashcardId, grafoId, grafoNome }: ViewFlashcardModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FlashcardData | null>(null);
  const [prevKey, setPrevKey] = useState("");

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && flashcardId ? flashcardId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setData(null); }
  }

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    loadFlashcard(flashcardId, grafoId, grafoNome)
      .then((d): void => { if (active) setData(d); })
      .catch((): void => { if (active) setData(null); })
      .finally((): void => { if (active) setLoading(false); });
    return (): void => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flashcardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Conteúdo do flashcard</DialogTitle>
          <DialogDescription>Apenas exibição — não conta como revisão.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Carregando...
            </div>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Não foi possível carregar este flashcard.
            </p>
          ) : (
            <FlashcardFace pergunta={data.pergunta} resposta={data.resposta} showAnswer />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
