import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FolderTreeIcon, DownloadIcon, UploadIcon,
  FolderOpenIcon, CheckCircleIcon, AlertTriangleIcon, RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { desktop } from "@/lib/vault-bridge";
import { existingVaultGraphDirectory } from "@/lib/vault-graph-manifest";
import { readPendingVaultGraph } from "@/lib/vault-graph-publication";
import {
  pullVault, pushVault, graphVaultDir, compareSyncState, getSyncState, removeOrphans,
  type SyncDiff, type VaultTransferProgress,
} from "@/lib/vault-sync";
import { validateVault, countErrors, type VaultIssue } from "@/lib/vault-validate";
import { VaultOrphans } from "./VaultOrphans";
import { VaultIssues } from "./VaultIssues";
import { VaultTransferStatus, type VaultTransferFeedback } from "./VaultTransferStatus";
import { VaultRelationChoices } from "./VaultRelationChoices";
import { VaultExamAttemptSync } from "./VaultExamAttemptSync";
import { resolveSharedVaultRelation, SharedVaultRelationError } from "@/lib/vault-relation-conflicts";
import type { VaultSyncState } from "@/lib/vault-bridge";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";

type BusyState = "pull" | "push" | "compare" | "clean" | "resolve" | null;

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
  onPulled?: () => void;
}

export function VaultSyncModal({ open, onOpenChange, grafoId, grafoNome, onSynced, onPulled }: VaultSyncModalProps) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [resolvedGraphDir, setResolvedGraphDir] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [transfer, setTransfer] = useState<VaultTransferFeedback | null>(null);
  const [relationIssue, setRelationIssue] = useState<SharedVaultRelationError | null>(null);
  const [diff, setDiff] = useState<SyncDiff | null>(null);
  const [diffError, setDiffError] = useState(false);
  const [pendingPublication, setPendingPublication] = useState(false);
  const [syncState, setSyncState] = useState<VaultSyncState | null>(null);
  const [issues, setIssues] = useState<VaultIssue[]>([]);
  // Um Push com erro de formato só passa no segundo clique, depois de a lista
  // de problemas ter sido mostrada.
  const [pushForcado, setPushForcado] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  const graphDir = resolvedGraphDir ?? (vaultPath ? graphVaultDir(vaultPath, grafoId, grafoNome) : null);
  const flags = deriveDiffFlags(diff);

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setResolvedGraphDir(null);
      setDiff(null); setDiffError(false); setSyncState(null);
      setPendingPublication(false);
      setTransfer(null);
      setRelationIssue(null);
      setIssues([]); setPushForcado(false);
    }
  }

  const runCompare = useCallback(async (dir: string): Promise<void> => {
    setBusy("compare");
    setDiffError(false);
    try {
      const gDir = await existingVaultGraphDirectory(grafoId) ?? graphVaultDir(dir, grafoId, grafoNome);
      setResolvedGraphDir(gDir);
      const pending = Boolean(await readPendingVaultGraph(gDir, grafoId));
      setPendingPublication(pending);
      const [d, s] = await Promise.all([pending ? Promise.resolve(null) : compareSyncState(grafoId, gDir), getSyncState(gDir)]);
      setDiff(d);
      setSyncState(s);
      // A validação acompanha a comparação: os problemas aparecem junto com o
      // diff, antes de o usuário decidir por Pull ou Push.
      setIssues(validateVault(await desktop.vault.read(gDir).catch(() => [])));
      setPushForcado(false);
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
    if (!vaultPath || pendingPublication) return;
    setBusy("pull");
    let progress: VaultTransferProgress = { phase: "downloading" };
    try {
      const { files } = await pullVault(grafoId, vaultPath, grafoNome, (next) => {
        progress = next;
        setTransfer({ kind: "running", progress: next });
      });
      setTransfer({ kind: "done", message: `Download concluído. ${files} arquivo(s) gravado(s) no vault.` });
      onPulled?.();
      await runCompare(vaultPath);
    } catch (e) {
      setTransfer({ kind: "error", progress, message: e instanceof Error ? e.message : "Erro ao baixar o grafo." });
      setBusy(null);
    }
  };

  const doPush = async (): Promise<void> => {
    if (!vaultPath) return;
    // Erro de formato para o Push no primeiro clique. Não é bloqueio definitivo:
    // o segundo clique envia assim mesmo, porque o dono do vault é o usuário.
    if (countErrors(issues) > 0 && !pushForcado) {
      setPushForcado(true);
      toast.error(`${countErrors(issues)} problema(s) de formato. Revise ou clique em Push de novo.`);
      return;
    }
    setBusy("push");
    setRelationIssue(null);
    let progress: VaultTransferProgress = { phase: "reading-vault" };
    try {
      const r = await pushVault(grafoId, grafoNome, (next) => {
        progress = next;
        setTransfer({ kind: "running", progress: next });
      });
      setTransfer({ kind: "done", message: pendingPublication
        ? `Grafo publicado em Meu Conhecimento. ${r.created} nó(s) criado(s) e ${r.updated} atualizado(s).`
        : `Envio concluído. ${r.created} nó(s) criado(s), ${r.updated} atualizado(s) e ${r.removed} desvinculado(s).` });
      onSynced?.();
      await runCompare(vaultPath);
    } catch (e) {
      if (e instanceof SharedVaultRelationError) {
        setRelationIssue(e);
        setTransfer(null);
      } else {
        setTransfer({ kind: "error", progress, message: e instanceof Error ? e.message : "Erro ao enviar o grafo." });
      }
      setBusy(null);
    }
  };

  const doResolveRelation = async (directory: string): Promise<void> => {
    if (!relationIssue || busy) return;
    setBusy("resolve");
    try {
      await resolveSharedVaultRelation(desktop.vault, relationIssue, directory);
      setTransfer({ kind: "done", message: "Relação atualizada no vault. Você já pode tentar enviar novamente." });
      onSynced?.();
    } catch (e) {
      setTransfer({
        kind: "error", progress: { phase: "checking-relations" },
        message: e instanceof Error ? e.message : "Erro ao atualizar a relação no vault.",
      });
    } finally {
      setRelationIssue(null);
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
            <VaultSyncOverview transfer={transfer} pendingPublication={pendingPublication}
              busy={busy} diff={diff} diffError={diffError} flags={flags} onRecompare={() => runCompare(vaultPath)}
              relationIssue={relationIssue} onResolve={doResolveRelation} onCancelResolution={() => setRelationIssue(null)} />
          )}

          {vaultPath && <VaultActions diff={diff} flags={flags} busy={busy} pendingPublication={pendingPublication}
            resolvingConflict={Boolean(relationIssue)} onPull={doPull} onPush={doPush} />}

          {graphDir && <VaultExamAttemptSync key={graphDir} directory={graphDir} graphId={grafoId}
            disabled={busy !== null || pendingPublication} />}

          {vaultPath && <VaultIssues issues={issues} pushBloqueado={pushForcado} />}

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

function VaultSyncOverview({
  transfer, pendingPublication, relationIssue, onResolve, onCancelResolution, ...comparison
}: React.ComponentProps<typeof VaultDiffStatus> & {
  transfer: VaultTransferFeedback | null;
  pendingPublication: boolean;
  relationIssue: SharedVaultRelationError | null;
  onResolve: (directory: string) => void;
  onCancelResolution: () => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 min-h-[60px]">
      {relationIssue && <VaultRelationChoices issue={relationIssue} resolving={comparison.busy === "resolve"}
        onChoose={onResolve} onCancel={onCancelResolution} />}
      {transfer && <VaultTransferStatus feedback={transfer} />}
      {!relationIssue && transfer?.kind !== "running" && (pendingPublication
        ? <p className="text-sm">Este grafo existe no vault. Ao publicar, ele será adicionado a Meu Conhecimento no servidor.</p>
        : <VaultDiffStatus {...comparison} />)}
    </div>
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
        Conferindo diferenças entre o vault e o servidor…
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
  pendingPublication,
  resolvingConflict,
  onPull,
  onPush,
}: {
  diff: SyncDiff | null;
  flags: DiffFlags;
  busy: BusyState;
  pendingPublication: boolean;
  resolvingConflict: boolean;
  onPull: () => void;
  onPush: () => void;
}) {
  const pullPrimary = flags.isConflict || flags.backendAhead || pullSuggestedForEmpty(diff);
  const pushPrimary = pendingPublication || flags.isConflict || flags.vaultAhead;
  const actionsDisabled = busy !== null || resolvingConflict;
  const labels = flags.isConflict ? { pull: "Confiar no servidor", push: "Confiar no vault" } : { pull: "Pull", push: "Push" };
  return (
    <div className="space-y-2">
      {flags.isConflict && (
        <p className="text-xs text-muted-foreground">
          Ambos os lados foram modificados. Escolha em qual confiar — o outro lado será sobrescrito.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <SyncButton
          onClick={onPull} primary={pullPrimary} disabled={actionsDisabled || pendingPublication}
          icon={<DownloadIcon className="size-4" />} label={busy === "pull" ? "Baixando grafo" : labels.pull}
        />
        <SyncButton
          onClick={onPush} primary={pushPrimary} disabled={actionsDisabled}
          icon={<UploadIcon className="size-4" />} label={busy === "push" ? "Enviando grafo" : pendingPublication ? "Publicar no servidor" : labels.push}
        />
      </div>
    </div>
  );
}

function SyncButton({
  onClick,
  primary,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  primary: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button onClick={onClick} disabled={disabled} variant={primary ? "default" : "outline"} className="gap-1.5">
      {icon}
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
