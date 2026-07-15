"use client";

import { PageContainer, NarrowColumn } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { settingsHttp } from "../infra/http";
import { resolveAiConfig, validateAiConfig, type AiConfig } from "../domain/ai-config";
import { ThemeSection } from "./components/ThemeSection";
import { CardStyleSection } from "./components/CardStyleSection";
import { AiConfigSection } from "./components/AiConfigSection";
import { DesktopSections } from "./components/DesktopSections";

// AI config the Claude Code toggle writes so backend calls route to the local proxy.
const CLAUDE_CODE_AI_CONFIG: AiConfig = {
  apiKey: "claude-code",
  baseUrl: "http://host.docker.internal:11435/v1",
  modelo: "claude-code",
};

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState<AiConfig>({ apiKey: "", baseUrl: "", modelo: "" });

  const desktopApp = isDesktop();
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [claudeCodeEnabled, setClaudeCodeEnabled] = useState(false);
  const [claudeCodeLoading, setClaudeCodeLoading] = useState(false);

  useEffect(() => {
    if (!desktopApp) return;
    desktop.vault.getPath().then(setVaultPath).catch(() => {});
    desktop.claudeCode.getConfig().then((cfg) => setClaudeCodeEnabled(cfg.enabled)).catch(() => {});
  }, [desktopApp]);

  // `loading` starts true, so the mount load must not setState synchronously in
  // the effect body — the fetch is kicked off synchronously; state settles in
  // the promise callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    settingsHttp
      .getAiConfig()
      .then((c) => { if (!cancelled) setConfig(resolveAiConfig(c)); })
      .catch((err) => { console.error(err); toast.error("Erro ao carregar configuracoes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const patchConfig = (patch: Partial<AiConfig>): void => setConfig((prev) => ({ ...prev, ...patch }));

  const handleSave = async (): Promise<void> => {
    const validationError = validateAiConfig(config.apiKey);
    if (validationError) { toast.error(validationError); return; }
    setSaving(true);
    try {
      await settingsHttp.saveAiConfig({
        apiKey: config.apiKey.trim(),
        baseUrl: config.baseUrl.trim(),
        modelo: config.modelo.trim(),
      });
      setSaved(true);
      setSaving(false);
      toast.success("Configuracoes de IA salvas com sucesso!");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configuracoes.");
      setSaving(false);
    }
  };

  const pickVaultFolder = async (): Promise<void> => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) { setVaultPath(dir); toast.success("Pasta do vault definida."); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const enableClaudeCode = async (): Promise<void> => {
    await desktop.claudeCode.setEnabled(true, config);
    await settingsHttp.saveAiConfig(CLAUDE_CODE_AI_CONFIG);
    setClaudeCodeEnabled(true);
    toast.success("Claude Code ativado. As chamadas de IA usarão o claude local.");
  };

  const disableClaudeCode = async (): Promise<void> => {
    const result = await desktop.claudeCode.setEnabled(false);
    const restored = result.savedApiConfig;
    if (restored) { await settingsHttp.saveAiConfig(restored); setConfig(restored); }
    setClaudeCodeEnabled(false);
    toast.success("Claude Code desativado. Usando a API configurada.");
  };

  const handleToggleClaudeCode = async (): Promise<void> => {
    if (!desktopApp) return;
    setClaudeCodeLoading(true);
    try {
      await (claudeCodeEnabled ? disableClaudeCode() : enableClaudeCode());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alternar Claude Code.");
    } finally {
      setClaudeCodeLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-zinc-400" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Configuracoes"
        subtitle="Personalize a aparencia e configure a API de IA."
      />
      {/* Formulário: o quadro da página é o padrão, os campos não. */}
      <NarrowColumn className="space-y-6 sm:space-y-8">
        <ThemeSection />
        <Separator />
        <CardStyleSection />
        <Separator />
        <AiConfigSection
          config={config}
          onChange={patchConfig}
          showKey={showKey}
          onToggleShowKey={() => setShowKey((v) => !v)}
          saving={saving}
          saved={saved}
          claudeCodeEnabled={claudeCodeEnabled}
          onSave={handleSave}
        />

        {desktopApp && (
          <DesktopSections
            vaultPath={vaultPath}
            onPickVault={pickVaultFolder}
            claudeCodeEnabled={claudeCodeEnabled}
            claudeCodeLoading={claudeCodeLoading}
            onToggleClaudeCode={handleToggleClaudeCode}
          />
        )}
      </NarrowColumn>
    </PageContainer>
  );
}
