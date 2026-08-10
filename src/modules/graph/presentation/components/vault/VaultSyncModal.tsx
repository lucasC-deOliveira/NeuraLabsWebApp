import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2Icon, FolderTreeIcon, DownloadIcon, UploadIcon,
  FolderOpenIcon, CheckCircleIcon, AlertTriangleIcon, RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { desktop } from "@/lib/vault-bridge";
import {
  pullVault, pushVault, graphVaultDir, compareSyncState, getSyncState, removeOrphans,
  type SyncDiff,
} from "@/lib/vault-sync";
import { VaultOrphans } from "./VaultOrphans";
import type { VaultSyncState } from "@/lib/vault-bridge";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";

type BusyState = "pull" | "push" | "compare" | "clean" | null;

interface DiffFlags {
  isConflict: boolean;
  backendAhead: boolean;
  vaultAhead: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function deriveDiffFlags(diff: SyncDiff | null): DiffFlags {
  if (!diff) return { isConflict: false, backendAhead: false, vaultAhead: false };
  const isConflict = diff.different > 0 || (diff.backendOnly > 0 && diff.vaultOnly > 0);
  return {
    isConflict,
    backendAhead: !isConflict && diff.backendOnly > 0,
    vaultAhead: !isConflict && diff.vaultOnly > 0,
  };
}

function pullSuggestedForEmpty(diff: SyncDiff | null): boolean {
  return !!diff?.vaultEmpty && (diff?.backendOnly ?? 0) > 0;
}

interface VaultSyncModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grafoId: string;
  grafoNome: string;
  onSynced?: () => void;
}

export function VaultSyncModal({ open, onOpenChange, grafoId, grafoNome, onSynced }: VaultSyncModalProps) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [diff, setDiff] = useState<SyncDiff | null>(null);
  const [diffError, setDiffError] = useState(false);
  const [syncState, setSyncState] = useState<VaultSyncState | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  const graphDir = vaultPath ? graphVaultDir(vaultPath, grafoId, grafoNome) : null;
  const flags = deriveDiffFlags(diff);

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setDiff(null); setDiffError(false); setSyncState(null); }
  }

  const runCompare = useCallback(async (dir: string): Promise<void> => {
    const gDir = graphVaultDir(dir, grafoId, grafoNome);
    setBusy("compare");
    setDiffError(false);
    try {
      const [d, s] = await Promise.all([compareSyncState(grafoId, gDir), getSyncState(gDir)]);
      setDiff(d);
      setSyncState(s);
    } catch {
      // exibe os botões mesmo se a comparação falhar
      setDiffError(true);
      setDiff(null);
    } finally {
      setBusy(null);
    }
  }, [grafoId, grafoNome]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // setState lives in the .then callback (async) — react-hooks v7 forbids it in the effect body.
    desktop.vault
      .getPath()
      .then((dir): void => { if (active) { setVaultPath(dir); if (dir) runCompare(dir); } })
      .catch((): void => { /* não-desktop */ });
    return (): void => { active = false; };
  }, [open, runCompare]);

  const pick = async (): Promise<void> => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) { setVaultPath(dir); runCompare(dir); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const doPull = async (): Promise<void> => {
    if (!vaultPath) return;
    setBusy("pull");
    try {
      const { files } = await pullVault(grafoId, vaultPath, grafoNome);
      toast.success(`Pull concluído: ${files} arquivo(s) gravado(s) no vault.`);
      await runCompare(vaultPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Pull.");
      setBusy(null);
    }
  };

  const doPush = async (): Promise<void> => {
    if (!vaultPath) return;
    setBusy("push");
    try {
      const r = await pushVault(grafoId, grafoNome);
      toast.success(`Push concluído: ${r.created} criado(s), ${r.updated} atualizado(s), ${r.removed} removido(s).`);
      onSynced?.();
      await runCompare(vaultPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Push.");
      setBusy(null);
    }
  };

  // Só é alcançável depois de a lista de órfãos ser exibida e confirmada — a
  // remoção nunca acontece como efeito colateral de Pull ou Push.
  const doCleanOrphans = async (): Promise<void> => {
    if (!vaultPath || !graphDir || !diff?.orphans.length) return;
    setBusy("clean");
    try {
      const { deleted, skipped } = await removeOrphans(graphDir, diff.orphans);
      if (skipped.length > 0) {
        toast.warning(`${deleted} arquivo(s) removido(s); ${skipped.length} recusado(s).`);
      } else {
        toast.success(`${deleted} arquivo(s) órfão(s) removido(s) do vault.`);
      }
      await runCompare(vaultPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover os órfãos.");
      setBusy(null);
    }
  };

  const openVaultFolder = async (): Promise<void> => {
    if (!graphDir) return;
    try {
      // Garante que a pasta, subpastas PARA e guia existam antes de abrir
      await desktop.vault.write(graphDir, [{ relPath: VAULT_GUIDE_FILENAME, content: buildVaultGuide() }]);
      await desktop.vault.openFolder(graphDir);
    } catch (e) {
      toast.error("Não foi possível abrir a pasta: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTreeIcon className="size-5" /> Vault Sync
          </DialogTitle>
          <DialogDescription>
            Sincronize este grafo com a pasta local de arquivos Markdown.
            Edite externamente no Obsidian ou Claude Code e sincronize de volta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <VaultFolderPicker vaultPath={vaultPath} graphDir={graphDir} busy={busy} onPick={pick} onOpenFolder={openVaultFolder} />

          {vaultPath && (
            <div className="rounded-md border p-3 space-y-2 min-h-[60px]">
              <VaultDiffStatus busy={busy} diff={diff} diffError={diffError} flags={flags} onRecompare={() => runCompare(vaultPath)} />
            </div>
          )}

          {vaultPath && <VaultActions diff={diff} flags={flags} busy={busy} onPull={doPull} onPush={doPush} />}

          {vaultPath && diff && (
            <VaultOrphans orphans={diff.orphans} busy={busy !== null} onClean={doCleanOrphans} />
          )}

          <VaultTimestamps syncState={syncState} />

          <p className="text-[11px] text-muted-foreground">
            <strong>Pull</strong> — sobrescreve o vault com o estado do servidor.{" "}
            <strong>Push</strong> — sobrescreve o servidor com o estado do vault.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VaultFolderPicker({
  vaultPath,
  graphDir,
  busy,
  onPick,
  onOpenFolder,
}: {
  vaultPath: string | null;
  graphDir: string | null;
  busy: BusyState;
  onPick: () => void;
  onOpenFolder: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Pasta do vault</Label>
      <div className="flex gap-2 min-w-0">
        <Input value={vaultPath ?? ""} placeholder="Nenhuma pasta selecionada" readOnly className="flex-1" />
        <Button type="button" variant="outline" onClick={onPick} disabled={busy !== null} className="shrink-0 gap-1.5">
          <FolderTreeIcon className="size-4" /> Escolher
        </Button>
      </div>
      {graphDir && (
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-mono truncate flex-1 min-w-0">📁 {graphDir}</p>
          <Button
            type="button" variant="ghost" size="sm" onClick={onOpenFolder}
            className="h-6 px-2 gap-1 text-[11px] text-muted-foreground shrink-0"
          >
            <FolderOpenIcon className="size-3" /> Abrir
          </Button>
        </div>
      )}
    </div>
  );
}

function VaultDiffStatus({
  busy,
  diff,
  diffError,
  flags,
  onRecompare,
}: {
  busy: BusyState;
  diff: SyncDiff | null;
  diffError: boolean;
  flags: DiffFlags;
  onRecompare: () => void;
}) {
  if (busy === "compare") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" /> Verificando...
      </div>
    );
  }
  return (
    <>
      <DiffMessage diff={diff} diffError={diffError} flags={flags} />
      <Button
        type="button" variant="ghost" size="sm" onClick={onRecompare} disabled={busy !== null}
        className="h-6 px-2 gap-1 text-[11px] text-muted-foreground"
      >
        <RefreshCwIcon className="size-3" /> Verificar
      </Button>
    </>
  );
}

function DiffMessage({ diff, diffError, flags }: { diff: SyncDiff | null; diffError: boolean; flags: DiffFlags }) {
  if (diffError) {
    return <p className="text-sm text-amber-600 dark:text-amber-400">Não foi possível comparar (servidor ou vault inacessível). Use Pull ou Push manualmente.</p>;
  }
  if (!diff) {
    return <p className="text-sm text-muted-foreground">Clique em Verificar para comparar servidor vs vault.</p>;
  }
  if (diff.inSync) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircleIcon className="size-4" /> Servidor e vault sincronizados.
      </div>
    );
  }
  if (diff.vaultEmpty) {
    if (diff.backendOnly === 0) {
      return <p className="text-sm text-muted-foreground">Vault vazio e servidor sem nós. Crie nós no grafo e faça Pull, ou adicione arquivos .md e faça Push.</p>;
    }
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Vault vazio — servidor tem {diff.backendOnly} nó(s).</p>
        <p className="text-xs text-muted-foreground">Faça Pull para exportar o grafo para a pasta.</p>
      </div>
    );
  }
  return <DiffDivergence diff={diff} flags={flags} />;
}

function DiffDivergence({ diff, flags }: { diff: SyncDiff; flags: DiffFlags }) {
  return (
    <div className="space-y-1.5">
      {flags.isConflict ? (
        <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangleIcon className="size-4" /> Conflito — servidor e vault divergem
        </div>
      ) : flags.backendAhead ? (
        <p className="text-sm font-medium">Servidor à frente do vault</p>
      ) : flags.vaultAhead ? (
        <p className="text-sm font-medium">Vault à frente do servidor</p>
      ) : null}
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        {diff.backendOnly > 0 && <span>Só no servidor: <strong>{diff.backendOnly}</strong></span>}
        {diff.vaultOnly > 0 && <span>Só no vault: <strong>{diff.vaultOnly}</strong></span>}
        {diff.different > 0 && <span>Conteúdo diferente: <strong>{diff.different}</strong></span>}
      </div>
    </div>
  );
}

function VaultActions({
  diff,
  flags,
  busy,
  onPull,
  onPush,
}: {
  diff: SyncDiff | null;
  flags: DiffFlags;
  busy: BusyState;
  onPull: () => void;
  onPush: () => void;
}) {
  const pullPrimary = flags.isConflict || flags.backendAhead || pullSuggestedForEmpty(diff);
  const pushPrimary = flags.isConflict || flags.vaultAhead;
  return (
    <div className="space-y-2">
      {flags.isConflict && (
        <p className="text-xs text-muted-foreground">
          Ambos os lados foram modificados. Escolha em qual confiar — o outro lado será sobrescrito.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <SyncButton
          onClick={onPull} primary={pullPrimary} loading={busy === "pull"} disabled={busy !== null}
          icon={<DownloadIcon className="size-4" />} label={flags.isConflict ? "Confiar no servidor" : "Pull"}
        />
        <SyncButton
          onClick={onPush} primary={pushPrimary} loading={busy === "push"} disabled={busy !== null}
          icon={<UploadIcon className="size-4" />} label={flags.isConflict ? "Confiar no vault" : "Push"}
        />
      </div>
    </div>
  );
}

function SyncButton({
  onClick,
  primary,
  loading,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  primary: boolean;
  loading: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button onClick={onClick} disabled={disabled} variant={primary ? "default" : "outline"} className="gap-1.5">
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

function VaultTimestamps({ syncState }: { syncState: VaultSyncState | null }) {
  if (!syncState || (!syncState.lastPull && !syncState.lastPush)) return null;
  return (
    <div className="text-[11px] text-muted-foreground border-t pt-2 space-y-0.5">
      {syncState.lastPull && <p>Último Pull: {formatDate(syncState.lastPull)}</p>}
      {syncState.lastPush && <p>Último Push: {formatDate(syncState.lastPush)}</p>}
    </div>
  );
}
