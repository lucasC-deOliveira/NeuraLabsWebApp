"use client";

import { useEffect, useState, useCallback } from "react";
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
  pullVault, pushVault, graphVaultDir, compareSyncState, getSyncState,
  type SyncDiff,
} from "@/lib/vault-sync";
import type { VaultSyncState } from "@/lib/vault-bridge";

type BusyState = "pull" | "push" | "compare" | null;

export function VaultSyncModal({ open, onOpenChange, grafoId, grafoNome, onSynced }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grafoId: string;
  grafoNome: string;
  onSynced?: () => void;
}) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [diff, setDiff] = useState<SyncDiff | null>(null);
  const [diffError, setDiffError] = useState(false);
  const [syncState, setSyncState] = useState<VaultSyncState | null>(null);

  const graphDir = vaultPath ? graphVaultDir(vaultPath, grafoId, grafoNome) : null;

  const runCompare = useCallback(async (dir: string) => {
    const gDir = graphVaultDir(dir, grafoId, grafoNome);
    setBusy("compare");
    setDiffError(false);
    try {
      const [d, s] = await Promise.all([
        compareSyncState(grafoId, gDir),
        getSyncState(gDir),
      ]);
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

  const load = useCallback(async () => {
    try {
      const dir = await desktop.vault.getPath();
      setVaultPath(dir);
      if (dir) runCompare(dir);
    } catch { /* não-desktop */ }
  }, [runCompare]);

  useEffect(() => {
    if (open) {
      setDiff(null);
      setDiffError(false);
      setSyncState(null);
      load();
    }
  }, [open, load]);

  const pick = async () => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) {
        setVaultPath(dir);
        runCompare(dir);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const doPull = async () => {
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

  const doPush = async () => {
    if (!vaultPath) return;
    setBusy("push");
    try {
      const r = await pushVault(grafoId, grafoNome);
      toast.success(
        `Push concluído: ${r.created} criado(s), ${r.updated} atualizado(s), ${r.removed} removido(s).`,
      );
      onSynced?.();
      await runCompare(vaultPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Push.");
      setBusy(null);
    }
  };

  // ------- lógica de estado do diff -------
  const isConflict = diff
    ? diff.different > 0 || (diff.backendOnly > 0 && diff.vaultOnly > 0)
    : false;
  const backendAhead = diff ? !isConflict && diff.backendOnly > 0 : false;
  const vaultAhead   = diff ? !isConflict && diff.vaultOnly > 0   : false;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

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
          {/* Seletor de pasta */}
          <div className="space-y-2">
            <Label>Pasta do vault</Label>
            <div className="flex gap-2 min-w-0">
              <Input
                value={vaultPath ?? ""}
                placeholder="Nenhuma pasta selecionada"
                readOnly
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={pick} disabled={busy !== null} className="shrink-0 gap-1.5">
                <FolderTreeIcon className="size-4" /> Escolher
              </Button>
            </div>
            {graphDir && (
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-[11px] text-muted-foreground font-mono truncate flex-1 min-w-0">📁 {graphDir}</p>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={async () => {
                    if (!graphDir) return;
                    try {
                      // Garante que a pasta e as subpastas PARA existam antes de abrir
                      await desktop.vault.write(graphDir, []);
                      await desktop.vault.openFolder(graphDir);
                    } catch (e) {
                      toast.error("Não foi possível abrir a pasta: " + (e instanceof Error ? e.message : String(e)));
                    }
                  }}
                  className="h-6 px-2 gap-1 text-[11px] text-muted-foreground shrink-0"
                >
                  <FolderOpenIcon className="size-3" /> Abrir
                </Button>
              </div>
            )}
          </div>

          {/* Status do diff */}
          {vaultPath && (
            <div className="rounded-md border p-3 space-y-2 min-h-[60px]">
              {busy === "compare" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" /> Verificando...
                </div>
              )}

              {busy !== "compare" && diff === null && !diffError && (
                <p className="text-sm text-muted-foreground">Clique em Verificar para comparar servidor vs vault.</p>
              )}

              {busy !== "compare" && diffError && (
                <p className="text-sm text-amber-600 dark:text-amber-400">Não foi possível comparar (servidor ou vault inacessível). Use Pull ou Push manualmente.</p>
              )}

              {busy !== "compare" && diff !== null && diff.inSync && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="size-4" /> Servidor e vault sincronizados.
                </div>
              )}

              {busy !== "compare" && diff !== null && !diff.inSync && diff.vaultEmpty && diff.backendOnly === 0 && (
                <p className="text-sm text-muted-foreground">Vault vazio e servidor sem nós. Crie nós no grafo e faça Pull, ou adicione arquivos .md e faça Push.</p>
              )}

              {busy !== "compare" && diff !== null && !diff.inSync && diff.vaultEmpty && diff.backendOnly > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Vault vazio — servidor tem {diff.backendOnly} nó(s).</p>
                  <p className="text-xs text-muted-foreground">Faça Pull para exportar o grafo para a pasta.</p>
                </div>
              )}

              {busy !== "compare" && diff !== null && !diff.inSync && !diff.vaultEmpty && (
                <div className="space-y-1.5">
                  {isConflict ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangleIcon className="size-4" /> Conflito — servidor e vault divergem
                    </div>
                  ) : backendAhead ? (
                    <p className="text-sm font-medium">Servidor à frente do vault</p>
                  ) : vaultAhead ? (
                    <p className="text-sm font-medium">Vault à frente do servidor</p>
                  ) : null}
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    {diff.backendOnly > 0 && <span>Só no servidor: <strong>{diff.backendOnly}</strong></span>}
                    {diff.vaultOnly > 0 && <span>Só no vault: <strong>{diff.vaultOnly}</strong></span>}
                    {diff.different > 0 && <span>Conteúdo diferente: <strong>{diff.different}</strong></span>}
                  </div>
                </div>
              )}

              {busy !== "compare" && (
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => vaultPath && runCompare(vaultPath)}
                  disabled={busy !== null}
                  className="h-6 px-2 gap-1 text-[11px] text-muted-foreground"
                >
                  <RefreshCwIcon className="size-3" /> Verificar
                </Button>
              )}
            </div>
          )}

          {/* Ações — sempre visíveis quando há uma pasta */}
          {vaultPath && (
            <div className="space-y-2">
              {isConflict && (
                <p className="text-xs text-muted-foreground">
                  Ambos os lados foram modificados. Escolha em qual confiar — o outro lado será sobrescrito.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={doPull}
                  disabled={busy !== null}
                  variant={isConflict || backendAhead || (diff?.vaultEmpty && (diff?.backendOnly ?? 0) > 0) ? "default" : "outline"}
                  className="gap-1.5"
                >
                  {busy === "pull" ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
                  {isConflict ? "Confiar no servidor" : "Pull"}
                </Button>
                <Button
                  onClick={doPush}
                  disabled={busy !== null}
                  variant={isConflict || vaultAhead ? "default" : "outline"}
                  className="gap-1.5"
                >
                  {busy === "push" ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                  {isConflict ? "Confiar no vault" : "Push"}
                </Button>
              </div>
            </div>
          )}

          {/* Timestamps */}
          {syncState && (syncState.lastPull || syncState.lastPush) && (
            <div className="text-[11px] text-muted-foreground border-t pt-2 space-y-0.5">
              {syncState.lastPull && <p>Último Pull: {formatDate(syncState.lastPull)}</p>}
              {syncState.lastPush && <p>Último Push: {formatDate(syncState.lastPush)}</p>}
            </div>
          )}

          {/* Legenda */}
          <p className="text-[11px] text-muted-foreground">
            <strong>Pull</strong> — sobrescreve o vault com o estado do servidor.{" "}
            <strong>Push</strong> — sobrescreve o servidor com o estado do vault.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
