import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Trash2Icon, FileWarningIcon } from "lucide-react";
import type { VaultOrphan } from "@/lib/vault-sync";

// Quantos órfãos aparecem antes de a lista virar "e mais N". O caso real que
// motivou isto tinha 19 arquivos — listar todos estoura o modal.
const VISIVEIS = 8;

interface VaultOrphansProps {
  orphans: VaultOrphan[];
  busy: boolean;
  onClean: () => void;
}

/**
 * Lista os `.md` que descrevem nós que o grafo não tem mais e oferece removê-los.
 *
 * A remoção é irreversível e fica atrás de uma confirmação explícita: o primeiro
 * clique só troca o rótulo do botão. Nunca acontece junto de um Pull ou Push.
 */
export function VaultOrphans({ orphans, busy, onClean }: VaultOrphansProps) {
  const [confirmando, setConfirmando] = useState(false);

  if (orphans.length === 0) return null;

  const restantes = orphans.length - VISIVEIS;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
        <FileWarningIcon className="size-4 shrink-0" />
        {orphans.length} arquivo(s) órfão(s) no vault
      </div>
      <p className="text-[11px] text-muted-foreground">
        Descrevem nós que o grafo não tem mais — normalmente sobras de um conceito
        renomeado, com conteúdo desatualizado. O Push os ignora, mas eles continuam
        sendo lidos por qualquer agente que abrir a pasta.
      </p>

      <ul className="space-y-0.5 max-h-40 overflow-y-auto">
        {orphans.slice(0, VISIVEIS).map((o) => (
          <li key={o.id} className="text-[11px] min-w-0">
            <span className="font-mono text-muted-foreground truncate block">{o.relPath}</span>
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <p className="text-[11px] text-muted-foreground">e mais {restantes} arquivo(s).</p>
      )}

      {confirmando ? (
        <div className="flex gap-2">
          <Button
            type="button" variant="destructive" size="sm" disabled={busy}
            onClick={() => { setConfirmando(false); onClean(); }}
            className="gap-1.5 h-7 text-xs"
          >
            {busy ? <Loader2Icon className="size-3 animate-spin" /> : <Trash2Icon className="size-3" />}
            Apagar {orphans.length} arquivo(s)
          </Button>
          <Button
            type="button" variant="ghost" size="sm" disabled={busy}
            onClick={() => setConfirmando(false)} className="h-7 text-xs"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button" variant="outline" size="sm" disabled={busy}
          onClick={() => setConfirmando(true)} className="gap-1.5 h-7 text-xs"
        >
          <Trash2Icon className="size-3" /> Remover órfãos
        </Button>
      )}
    </div>
  );
}
