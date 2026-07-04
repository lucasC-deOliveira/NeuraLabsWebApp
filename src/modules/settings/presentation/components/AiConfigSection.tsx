"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SettingsIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon, SparklesIcon } from "lucide-react";
import type { AiConfig } from "../../domain/ai-config";

interface AiConfigSectionProps {
  config: AiConfig;
  onChange: (patch: Partial<AiConfig>) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  saving: boolean;
  saved: boolean;
  claudeCodeEnabled: boolean;
  onSave: () => void;
}

function SaveButtonLabel({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saved) return <><CheckCircle2Icon className="size-4 mr-1 text-green-400" />Salvo!</>;
  if (saving) return <><Loader2Icon className="size-4 mr-1 animate-spin" />Salvando...</>;
  return <>Salvar configuracoes</>;
}

export function AiConfigSection({
  config, onChange, showKey, onToggleShowKey, saving, saved, claudeCodeEnabled, onSave,
}: AiConfigSectionProps) {
  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <SettingsIcon className="size-5" />
          Conexao com IA
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Configure as credenciais da API. Os valores padrao usam variaveis de ambiente (.env).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {claudeCodeEnabled && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/8 px-3 py-2.5 flex items-center gap-2">
            <SparklesIcon className="size-4 text-violet-500 shrink-0" />
            <p className="text-xs text-violet-700 dark:text-violet-300">
              <span className="font-semibold">Claude Code ativo.</span>{" "}
              Desative-o abaixo para editar a configuração de API.
            </p>
          </div>
        )}
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder="sk-or-v1-..."
              value={config.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              className="pr-10"
              disabled={claudeCodeEnabled}
            />
            <button
              type="button"
              onClick={onToggleShowKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 disabled:pointer-events-none"
              disabled={claudeCodeEnabled}
            >
              {showKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sua chave e armazenada no banco de dados e usada para todas as chamadas de IA.
          </p>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            placeholder="https://openrouter.ai/api/v1"
            value={config.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            disabled={claudeCodeEnabled}
          />
          <p className="text-[10px] text-muted-foreground">
            URL base da API. Para OpenRouter: {"https://openrouter.ai/api/v1"}
          </p>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            placeholder="qwen/qwen3.6-plus:free"
            value={config.modelo}
            onChange={(e) => onChange({ modelo: e.target.value })}
            disabled={claudeCodeEnabled}
          />
          <p className="text-[10px] text-muted-foreground">
            ID do modelo. Ex: {"gpt-4o-mini"}, {"qwen/qwen3.6-plus:free"}, etc.
          </p>
        </div>

        <Button onClick={onSave} disabled={saving || claudeCodeEnabled} size="lg" className="w-full">
          <SaveButtonLabel saving={saving} saved={saved} />
        </Button>
      </CardContent>
    </Card>
  );
}
