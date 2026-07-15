import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { settingsHttp } from "../../infra/http";
import type { AiConfig } from "../../domain/ai-config";

// Ajustes que só existem no app desktop. São duas coisas independentes — a pasta do
// vault e o Claude Code local — então são dois hooks; quem precisa só de uma não
// carrega a outra.

// Config que faz o backend rotear as chamadas de IA para o proxy local do Claude Code.
const CLAUDE_CODE_AI_CONFIG: AiConfig = {
  apiKey: "claude-code",
  baseUrl: "http://host.docker.internal:11435/v1",
  modelo: "claude-code",
};

async function pickVault(setVaultPath: (path: string) => void): Promise<void> {
  try {
    const dir = await desktop.vault.pickFolder();
    if (dir) {
      setVaultPath(dir);
      toast.success("Pasta do vault definida.");
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
  }
}

export interface VaultState {
  vaultPath: string | null;
  pickVaultFolder: () => Promise<void>;
}

/**
 * Pasta do vault. Ler não pode derrubar a tela: sem ponte, o caminho fica vazio.
 * @example const { vaultPath, pickVaultFolder } = useVaultPath();
 */
export function useVaultPath(): VaultState {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  useEffect(() => {
    if (isDesktop()) desktop.vault.getPath().then(setVaultPath).catch(() => {});
  }, []);
  return {
    vaultPath,
    pickVaultFolder: useCallback((): Promise<void> => pickVault(setVaultPath), []),
  };
}

// Ligar: guarda a config atual na ponte e aponta o backend para o proxy local.
async function enableClaudeCode(aiConfig: AiConfig): Promise<void> {
  await desktop.claudeCode.setEnabled(true, aiConfig);
  await settingsHttp.saveAiConfig(CLAUDE_CODE_AI_CONFIG);
  toast.success("Claude Code ativado. As chamadas de IA usarão o claude local.");
}

// Desligar: devolve a config guardada, se houver.
async function disableClaudeCode(onRestore: (config: AiConfig) => void): Promise<void> {
  const result = await desktop.claudeCode.setEnabled(false);
  const restored = result.savedApiConfig;
  if (restored) {
    await settingsHttp.saveAiConfig(restored);
    onRestore(restored);
  }
  toast.success("Claude Code desativado. Usando a API configurada.");
}

/**
 * Liga ou desliga, devolvendo o estado novo — ou null se falhou, para o hook não
 * mostrar um interruptor que não corresponde ao que aconteceu.
 */
async function switchClaudeCode(
  ligar: boolean,
  aiConfig: AiConfig,
  onRestore: (config: AiConfig) => void,
): Promise<boolean | null> {
  try {
    await (ligar ? enableClaudeCode(aiConfig) : disableClaudeCode(onRestore));
    return ligar;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Erro ao alternar Claude Code.");
    return null;
  }
}

export interface ClaudeCodeState {
  enabled: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

/**
 * Claude Code local. Ligar troca a config de IA ativa pela do proxy e guarda a
 * antiga; desligar devolve a guardada — daí receber a config atual e como aplicar
 * a restaurada.
 * @example const { enabled, toggle } = useClaudeCode(config, replace);
 */
export function useClaudeCode(
  aiConfig: AiConfig,
  onRestoreAiConfig: (config: AiConfig) => void,
): ClaudeCodeState {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isDesktop()) desktop.claudeCode.getConfig().then((c) => setEnabled(c.enabled)).catch(() => {});
  }, []);
  const toggle = useCallback(async (): Promise<void> => {
    setLoading(true);
    const ligou = await switchClaudeCode(!enabled, aiConfig, onRestoreAiConfig);
    if (ligou !== null) setEnabled(ligou);
    setLoading(false);
  }, [enabled, aiConfig, onRestoreAiConfig]);
  return { enabled, loading, toggle };
}
