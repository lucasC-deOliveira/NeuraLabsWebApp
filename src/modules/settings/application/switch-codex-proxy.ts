import type { CodexProxyState } from "@/lib/vault-bridge";
import type { AiConfig } from "../domain/ai-config";
import type { SettingsPort } from "./ports/settings.port";

export interface CodexProxyPort {
  getConfig(): Promise<CodexProxyState>;
  start(previous: AiConfig | null): Promise<AiConfig>;
  stop(): Promise<void>;
}

type ProviderSettings = Pick<SettingsPort, "getAiConfig" | "saveAiConfig" | "resetAiConfig">;

function matchesProxy(config: AiConfig | null, proxy: AiConfig): boolean {
  return config?.apiKey === proxy.apiKey && config.baseUrl === proxy.baseUrl && config.modelo === proxy.modelo;
}

/** Starts the local proxy and directs the current signed-in backend account to it.
 * @example const effective = await enableCodexProxy(proxy, settings)
 */
export async function enableCodexProxy(local: CodexProxyPort, settings: ProviderSettings): Promise<AiConfig> {
  const previous = await settings.getAiConfig();
  const proxy = await local.start(previous);
  try {
    await settings.saveAiConfig(proxy);
  } catch (error) {
    const confirmed = await settings.getAiConfig();
    if (matchesProxy(confirmed, proxy)) return proxy;
    await local.stop();
    throw error;
  }
  return proxy;
}

/** Restores the account's exact previous provider before closing the local listener.
 * @example const previous = await disableCodexProxy(proxy, settings)
 */
export async function disableCodexProxy(local: CodexProxyPort, settings: ProviderSettings): Promise<AiConfig | null> {
  const state = await local.getConfig();
  const current = await settings.getAiConfig();
  if (!state.enabled) return current;
  if (!matchesProxy(current, state.proxy)) {
    throw new Error("Entre na conta que ativou o Codex e confira o provedor antes de desativá-lo.");
  }
  if (state.previous) await settings.saveAiConfig(state.previous);
  else await settings.resetAiConfig();
  await local.stop();
  return state.previous;
}
