"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SettingsIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { getConfigAI, saveConfigAI } from "@/actions/settings";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelo, setModelo] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getConfigAI();
      if (config) {
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl);
        setModelo(config.modelo);
      } else {
        // Defaults from env
        setApiKey("");
        setBaseUrl("https://openrouter.ai/api/v1");
        setModelo("qwen/qwen3.6-plus:free");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar configuracoes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("A API key e obrigatoria.");
      return;
    }
    setSaving(true);
    try {
      await saveConfigAI({ apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), modelo: modelo.trim() });
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Configuracoes</h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure a API de IA para analise de texto e geracao de notas.
        </p>
      </div>

      <Separator />

      <Card className="border-zinc-200 dark:border-zinc-800">
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
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              Sua chave e armazenada no banco de dados e usada para todas as chamadas de IA.
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://openrouter.ai/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-[10px] text-zinc-400">
              URL base da API. Para OpenRouter: {"https://openrouter.ai/api/v1"}
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="modelo">Modelo</Label>
            <Input
              id="modelo"
              placeholder="qwen/qwen3.6-plus:free"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
            />
            <p className="text-[10px] text-zinc-400">
              ID do modelo. Ex: {"gpt-4o-mini"}, {"qwen/qwen3.6-plus:free"}, etc.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
            {saved ? (
              <>
                <CheckCircle2Icon className="size-4 mr-1 text-green-400" />
                Salvo!
              </>
            ) : saving ? (
              <>
                <Loader2Icon className="size-4 mr-1 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar configuracoes"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
