"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, FolderTreeIcon, DownloadIcon, UploadIcon, FolderOpenIcon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { desktop } from "@/lib/vault-bridge";
import { pullVault, pushVault, graphVaultDir, getSyncState, getModifiedCount } from "@/lib/vault-sync";
import type { VaultSyncState } from "@/lib/vault-bridge";

export function VaultSyncModal({ open, onOpenChange, grafoId, grafoNome, onSynced }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grafoId: string;
  grafoNome: string;
  onSynced?: () => void;
}) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);
  const [syncState, setSyncState] = useState<VaultSyncState | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  const loadSyncState = useCallback(async (dir: string) => {
    const graphDir = graphVaultDir(dir, grafoId, grafoNome);
    const state = await getSyncState(graphDir);
    setSyncState(state);
  }, [grafoId, grafoNome]);

  const load = useCallback(async () => {
    try {
      const dir = await desktop.vault.getPath();
      setVaultPath(dir);
      if (dir) await loadSyncState(dir);
    } catch { /* não-desktop */ }
  }, [loadSyncState]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const pick = async () => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) {
        setVaultPath(dir);
        await loadSyncState(dir);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const executePull = async () => {
    if (!vaultPath) return;
    setBusy("pull");
    setShowConflictWarning(false);
    try {
      const { files } = await pullVault(grafoId, vaultPath, grafoNome);
      toast.success(`Baixado: ${files} arquivo(s) no vault.`);
      await loadSyncState(vaultPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Pull.");
    } finally {
      setBusy(null);
    }
  };

  const doPull = async () => {
    if (!vaultPath) return;
    // verifica se há arquivos editados localmente desde o último Pull
    if (syncState?.lastPull) {
      const graphDir = graphVaultDir(vaultPath, grafoId, grafoNome);
      const count = await getModifiedCount(graphDir, syncState.lastPull);
      if (count > 0) {
        setConflictCount(count);
        setShowConflictWarning(true);
        return;
      }
    }
    await executePull();
  };

  const doPush = async () => {
    if (!vaultPath) return;
    setBusy("push");
    try {
      const r = await pushVault(grafoId, grafoNome);
      toast.success(`Enviado: ${r.created} criado(s), ${r.updated} atualizado(s), ${r.removed} removido(s), ${r.edges} relação(ões).`);
      if (vaultPath) await loadSyncState(vaultPath);
      onSynced?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Push.");
    } finally {
      setBusy(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderTreeIcon className="size-5" /> Vault (Markdown)</DialogTitle>
          <DialogDescription>
            Sincronize este grafo com uma pasta local de arquivos Markdown (formato PARA),
            editável no Obsidian ou pelo Claude Code. Um <code>AGENTS.md</code> com as regras
            é gravado na raiz a cada Pull.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pasta do vault</Label>
            <div className="flex gap-2">
              <Input value={vaultPath ?? ""} placeholder="Nenhuma pasta selecionada" readOnly className="flex-1" />
              <Button type="button" variant="outline" onClick={pick} className="shrink-0 gap-1.5">
                <FolderTreeIcon className="size-4" /> Escolher
              </Button>
            </div>
          </div>

          {showConflictWarning && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5 text-destructive">
                <AlertTriangleIcon className="size-4" />
                {conflictCount} arquivo(s) editado(s) localmente
              </p>
              <p className="text-xs text-muted-foreground">
                Pull vai sobrescrever as edições feitas na pasta desde o último sync.
                Faça Push primeiro se quiser enviá-las ao backend.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={busy !== null} onClick={executePull}>
                  {busy === "pull" ? <Loader2Icon className="size-3 animate-spin mr-1" /> : null}
                  Sobrescrever assim mesmo
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowConflictWarning(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={doPull} disabled={!vaultPath || busy !== null} className="gap-1.5">
              {busy === "pull" ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
              Pull (backend → pasta)
            </Button>
            <Button onClick={doPush} disabled={!vaultPath || busy !== null} variant="secondary" className="gap-1.5">
              {busy === "push" ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              Push (pasta → backend)
            </Button>
          </div>

          {vaultPath && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                📁 {graphVaultDir(vaultPath, grafoId, grafoNome)}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => desktop.vault.openFolder(graphVaultDir(vaultPath, grafoId, grafoNome))} className="gap-1.5 text-muted-foreground">
                <FolderOpenIcon className="size-4" /> Abrir pasta do grafo
              </Button>
            </div>
          )}

          {syncState && (syncState.lastPull || syncState.lastPush) && (
            <div className="text-[11px] text-muted-foreground space-y-0.5 border-t pt-2">
              {syncState.lastPull && <p>Último Pull: {formatDate(syncState.lastPull)}</p>}
              {syncState.lastPush && <p>Último Push: {formatDate(syncState.lastPush)}</p>}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            <strong>Pull</strong> sobrescreve os <code>.md</code> da pasta com o estado do backend.
            <strong> Push</strong> faz upsert por <code>id</code> (atualiza conteúdo, cria novos),
            substitui as relações do grafo pelas do vault e <strong>remove do grafo</strong> os nós
            cujo <code>.md</code> sumiu (a entidade e o SRS são preservados).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
