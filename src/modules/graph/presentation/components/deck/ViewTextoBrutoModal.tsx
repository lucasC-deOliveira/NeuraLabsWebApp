import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import { isDesktop } from "@/lib/vault-bridge";
import { findVaultNode } from "@/lib/vault-sync";

interface ViewTextoBrutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textoId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

interface TextoBrutoData {
  titulo: string;
  texto: string;
}

async function loadFromVault(textoId: string, grafoId?: string, grafoNome?: string): Promise<TextoBrutoData | null> {
  if (!isDesktop() || !grafoId || !grafoNome) return null;
  const vn = await findVaultNode(grafoId, grafoNome, textoId, "TEXTO_BRUTO");
  if (!vn) return null;
  return { titulo: vn.titulo ?? vn.nome ?? "Texto bruto", texto: vn.texto ?? "" };
}

async function loadFromBackend(textoId: string): Promise<TextoBrutoData | null> {
  try {
    const details = await graphHttp.getNodeDetails("TEXTO_BRUTO", textoId);
    if (details) return { titulo: details.titulo ?? details.nome ?? "Texto bruto", texto: details.texto ?? "" };
  } catch { /* não está no backend */ }
  return null;
}

// Not `async` so the backend fetch is issued synchronously in the non-desktop path
// (an extra `await` on the vault check would defer getNodeDetails by a microtask).
function loadTextoBruto(textoId: string, grafoId?: string, grafoNome?: string): Promise<TextoBrutoData | null> {
  if (isDesktop() && grafoId && grafoNome) {
    return loadFromVault(textoId, grafoId, grafoNome).then((v) => v ?? loadFromBackend(textoId));
  }
  return loadFromBackend(textoId);
}

export function ViewTextoBrutoModal({ open, onOpenChange, textoId, grafoId, grafoNome }: ViewTextoBrutoModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TextoBrutoData | null>(null);
  const [prevKey, setPrevKey] = useState("");

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && textoId ? textoId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setData(null); }
  }

  useEffect(() => {
    if (!open || !textoId) return;
    let ignore = false;
    loadTextoBruto(textoId, grafoId, grafoNome)
      .then((d): void => { if (!ignore) setData(d); })
      .catch((): void => { if (!ignore) setData(null); })
      .finally((): void => { if (!ignore) setLoading(false); });
    return (): void => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, textoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{data?.titulo ?? "Texto bruto"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : !data?.texto ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum conteúdo disponível.
            </p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{data.texto}</pre>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
