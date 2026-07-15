"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useAiConfig } from "../hooks/useAiConfig";
import { useClaudeCode } from "../hooks/useDesktopSettings";
import { AiConfigSection } from "./AiConfigSection";

// A seção de IA precisa saber se o Claude Code está ligado (ele sequestra a config
// ativa), por isso também o consulta.
export function IaSectionBody() {
  const ai = useAiConfig();
  const { enabled: claudeCodeEnabled } = useClaudeCode(ai.config, ai.replace);
  const [showKey, setShowKey] = useState(false);

  if (ai.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <AiConfigSection
      config={ai.config}
      onChange={ai.patch}
      showKey={showKey}
      onToggleShowKey={() => setShowKey((v) => !v)}
      saving={ai.saving}
      saved={ai.saved}
      claudeCodeEnabled={claudeCodeEnabled}
      onSave={ai.save}
    />
  );
}
