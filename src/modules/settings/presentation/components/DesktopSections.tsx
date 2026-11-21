"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FolderTreeIcon, FolderOpenIcon, TerminalIcon } from "lucide-react";
import { desktop } from "@/lib/vault-bridge";
import { VaultStudySyncControls } from "./VaultStudySyncControls";

const CLAUDE_CODE_PROXY_PORT = 11435;

interface DesktopSectionsProps {
  vaultPath: string | null;
  onPickVault: () => void;
  claudeCodeEnabled: boolean;
  claudeCodeLoading: boolean;
  onToggleClaudeCode: () => void;
  codexEnabled: boolean;
  codexLoading: boolean;
  onToggleCodex: () => void;
}

function VaultCard({ vaultPath, onPickVault }: { vaultPath: string | null; onPickVault: () => void }) {
  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <FolderTreeIcon className="size-5" />
          Vault
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Esta pasta guarda os baralhos, flashcards e revisões usados no desktop.
          Para sincronizar os arquivos Markdown de um grafo, use o botão <strong>Vault</strong> no próprio grafo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        <div className="space-y-2">
          <Label>Pasta do vault</Label>
          <div className="flex gap-2">
            <Input value={vaultPath ?? ""} placeholder="Nenhuma pasta selecionada" readOnly className="flex-1" />
            <Button type="button" variant="outline" onClick={onPickVault} className="shrink-0 gap-1.5">
              <FolderTreeIcon className="size-4" /> Escolher
            </Button>
          </div>
        </div>

        {vaultPath && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => desktop.vault.openFolder(vaultPath)}
            className="gap-1.5 text-muted-foreground"
          >
            <FolderOpenIcon className="size-4" /> Abrir pasta
          </Button>
        )}
        {vaultPath && <VaultStudySyncControls key={vaultPath} folder={vaultPath} />}
      </CardContent>
    </Card>
  );
}

function ClaudeCodeCard({
  enabled, loading, onToggle,
}: { enabled: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TerminalIcon className="size-5" />
          Claude Code (local)
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Usa o <code className="font-mono text-xs">claude</code> instalado localmente em vez de uma API remota.
          Requer autenticação prévia com <code className="font-mono text-xs">claude /login</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <div>
            <p className="text-sm font-medium">Usar Claude Code para IA</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Instale com:{" "}
              <code className="font-mono">npm install -g @anthropic-ai/claude-code</code>
            </p>
          </div>
          <div
            className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
              enabled ? "bg-violet-600" : "bg-muted-foreground/30"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
            onClick={loading ? undefined : onToggle}
          >
            <div
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </label>

        {enabled && (
          <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Ativo
            </p>
            <p className="text-xs text-muted-foreground">
              Proxy rodando em{" "}
              <code className="font-mono">localhost:{CLAUDE_CODE_PROXY_PORT}</code>. O backend Docker usa{" "}
              <code className="font-mono">host.docker.internal:{CLAUDE_CODE_PROXY_PORT}</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique se está autenticado:{" "}
              <code className="font-mono">claude /status</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DesktopSections({
  vaultPath, onPickVault, claudeCodeEnabled, claudeCodeLoading, onToggleClaudeCode,
  codexEnabled, codexLoading, onToggleCodex,
}: DesktopSectionsProps) {
  return (
    <>
      <Separator />
      <VaultCard vaultPath={vaultPath} onPickVault={onPickVault} />
      <Separator />
      <ClaudeCodeCard enabled={claudeCodeEnabled} loading={claudeCodeLoading} onToggle={onToggleClaudeCode} />
      <CodexProxyCard enabled={codexEnabled} loading={codexLoading} claudeActive={claudeCodeEnabled} onToggle={onToggleCodex} />
    </>
  );
}

function CodexProxyCard({ enabled, loading, claudeActive, onToggle }: {
  enabled: boolean; loading: boolean; claudeActive: boolean; onToggle: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TerminalIcon className="size-5" /> ChatGPT via Codex CLI</CardTitle>
        <CardDescription>Usa o Codex instalado neste computador como provedor de IA do NeuraLabs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{claudeActive ? "Desative o Claude Code para selecionar o Codex."
          : "Entre no Codex CLI com sua conta do ChatGPT usando codex login antes de ativar."}</p>
        <Button type="button" variant="outline" disabled={loading || claudeActive} onClick={onToggle}>
          {loading ? "Atualizando provedor…" : enabled ? "Desativar Codex" : "Ativar Codex"}
        </Button>
      </CardContent>
    </Card>
  );
}
