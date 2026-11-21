import { expect, it } from "vitest";
import type { CodexProxyState } from "@/lib/vault-bridge";
import { disableCodexProxy, enableCodexProxy, type CodexProxyPort } from "./switch-codex-proxy";
import type { AiConfig } from "../domain/ai-config";

const codex: AiConfig = { apiKey: "token", baseUrl: "http://host.docker.internal:11436/v1", modelo: "codex" };
const original: AiConfig = { apiKey: "previous", baseUrl: "https://provider.example/v1", modelo: "model" };

class FakeLocalCodex implements CodexProxyPort {
  state: CodexProxyState = { enabled: false };

  async getConfig(): Promise<CodexProxyState> {
    return this.state;
  }

  async start(previous: AiConfig | null): Promise<AiConfig> {
    this.state = { enabled: true, previous, proxy: codex };
    return codex;
  }

  async stop(): Promise<void> {
    this.state = { enabled: false };
  }
}

class FakeProviderSettings {
  rejectSave = false;
  constructor(private config: AiConfig | null) {}

  async getAiConfig(): Promise<AiConfig | null> {
    return this.config;
  }

  async saveAiConfig(config: AiConfig): Promise<void> {
    if (this.rejectSave) throw new Error("Backend unavailable");
    this.config = config;
  }

  async resetAiConfig(): Promise<void> {
    this.config = null;
  }
}

it.each([null, original])("restores the original provider including an absent account override", async (previous) => {
  const local = new FakeLocalCodex();
  const settings = new FakeProviderSettings(previous);
  await expect(enableCodexProxy(local, settings)).resolves.toEqual(codex);
  await expect(settings.getAiConfig()).resolves.toEqual(codex);
  await expect(disableCodexProxy(local, settings)).resolves.toEqual(previous);
  await expect(settings.getAiConfig()).resolves.toEqual(previous);
  await expect(local.getConfig()).resolves.toEqual({ enabled: false });
});

it("closes a newly started listener when the backend rejects the provider change", async () => {
  const local = new FakeLocalCodex();
  const settings = new FakeProviderSettings(original);
  settings.rejectSave = true;
  await expect(enableCodexProxy(local, settings)).rejects.toThrow("Backend unavailable");
  await expect(local.getConfig()).resolves.toEqual({ enabled: false });
  await expect(settings.getAiConfig()).resolves.toEqual(original);
});
