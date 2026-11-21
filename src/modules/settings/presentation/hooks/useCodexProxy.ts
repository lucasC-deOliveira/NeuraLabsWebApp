import { useEffect, useState } from "react";
import { toast } from "sonner";
import { desktop, isDesktop } from "@/lib/vault-bridge";
import type { AiConfig } from "../../domain/ai-config";
import { resolveAiConfig } from "../../domain/ai-config";
import { settingsHttp } from "../../infra/http";
import { disableCodexProxy, enableCodexProxy } from "../../application/switch-codex-proxy";

interface CodexControl {
  enabled: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

async function applyCodexToggle(
  enabled: boolean, replace: (config: AiConfig) => void, setEnabled: (enabled: boolean) => void,
): Promise<void> {
  try {
    const config = enabled ? await disableCodexProxy(desktop.codexProxy, settingsHttp)
      : await enableCodexProxy(desktop.codexProxy, settingsHttp);
    replace(resolveAiConfig(config));
    setEnabled(!enabled);
    toast.success(enabled ? "Codex desativado. Provedor anterior restaurado." : "Codex ativado como provedor de IA.");
  } catch (error) {
    const state = await desktop.codexProxy.getConfig().catch(() => null);
    if (state) setEnabled(state.enabled);
    toast.error(error instanceof Error ? error.message : "Não foi possível alternar o Codex.");
  }
}

/** Exposes the local Codex provider controls to the desktop settings.
 * @example const codex = useCodexProxy(config.replace)
 */
export function useCodexProxy(replace: (config: AiConfig) => void): CodexControl {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(isDesktop);
  useEffect(() => {
    if (isDesktop()) void desktop.codexProxy.getConfig()
      .then((state) => setEnabled(state.enabled)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  async function toggle(): Promise<void> {
    setLoading(true);
    try {
      await applyCodexToggle(enabled, replace, setEnabled);
    } finally {
      setLoading(false);
    }
  }
  return { enabled, loading, toggle };
}
