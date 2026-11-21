"use client";

import { useAiConfig } from "../hooks/useAiConfig";
import { useVaultPath, useClaudeCode } from "../hooks/useDesktopSettings";
import { DesktopSections } from "./DesktopSections";
import { useCodexProxy } from "../hooks/useCodexProxy";

// Carrega a config de IA porque ligar o Claude Code guarda a config atual para
// devolvê-la ao desligar.
export function DesktopSectionBody() {
  const ai = useAiConfig();
  const { vaultPath, pickVaultFolder } = useVaultPath();
  const claudeCode = useClaudeCode(ai.config, ai.replace);
  const codex = useCodexProxy(ai.replace);

  return (
    <DesktopSections
      vaultPath={vaultPath}
      onPickVault={pickVaultFolder}
      claudeCodeEnabled={claudeCode.enabled}
      claudeCodeLoading={claudeCode.loading || codex.loading || codex.enabled}
      onToggleClaudeCode={claudeCode.toggle}
      codexEnabled={codex.enabled}
      codexLoading={codex.loading || claudeCode.loading}
      onToggleCodex={codex.toggle}
    />
  );
}
