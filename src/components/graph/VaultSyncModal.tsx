"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, FolderTreeIcon, DownloadIcon, UploadIcon, FolderOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { desktop } from "@/lib/vault-bridge";
import { pullVault, pushVault } from "@/lib/vault-sync";

export function VaultSyncModal({ open, onOpenChange, grafoId, onSynced }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grafoId: string;
  onSynced?: () => void;
}) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);

  const load = useCallback(async () => {
    try { setVaultPath(await desktop.vault.getPath()); } catch { /* não-desktop */ }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const pick = async () => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) setVaultPath(dir);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const doPull = async () => {
    if (!vaultPath) return;
    setBusy("pull");
    try {
      const { files } = await pullVault(grafoId, vaultPath);
      toast.success(`Baixado: ${files} arquivo(s) no vault.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Pull.");
    } finally {
      setBusy(null);
    }
  };

  const doPush = async () => {
    if (!vaultPath) return;
    setBusy("push");
    try {
      const r = await pushVault(grafoId);
      toast.success(`Enviado: ${r.created} criado(s), ${r.updated} atualizado(s), ${r.edges} relação(ões).`);
      onSynced?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Push.");
    } finally {
      setBusy(null);
    }
  };

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
            <Button type="button" variant="ghost" size="sm" onClick={() => desktop.vault.openFolder(vaultPath)} className="gap-1.5 text-muted-foreground">
              <FolderOpenIcon className="size-4" /> Abrir pasta
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground">
            <strong>Pull</strong> sobrescreve os <code>.md</code> da pasta com o estado do backend.
            <strong> Push</strong> faz upsert por <code>id</code> (atualiza conteúdo, cria novos) e
            substitui as relações do grafo pelas do vault. Nós removidos da pasta não são apagados
            no backend.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
