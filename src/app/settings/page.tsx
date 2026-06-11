"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SettingsIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon, PaletteIcon } from "lucide-react";
import { toast } from "sonner";
import { getConfigAI, saveConfigAI } from "@/actions/settings";
import { useColorTheme, type ColorTheme } from "@/components/color-theme-provider";

type ThemeOption = { id: ColorTheme; name: string; bg: string; card: string; accent: string };

const DARK_THEMES: ThemeOption[] = [
  { id: "classic-gx",        name: "Classic GX",        bg: "#1a0a0a", card: "#260f0f", accent: "#FA1E4E" },
  { id: "cyber-ultraviolet", name: "Cyber Ultraviolet", bg: "#0f0a1a", card: "#160f26", accent: "#9D4EDD" },
  { id: "chroma-teal",       name: "Chroma Teal",       bg: "#091a19", card: "#0f2625", accent: "#00F5D4" },
  { id: "acid-toxic",        name: "Acid Toxic",        bg: "#091409", card: "#0e1f0e", accent: "#39FF14" },
];

const LIGHT_THEMES: ThemeOption[] = [
  { id: "light-gx-core", name: "Light GX Core", bg: "#fafafa", card: "#ffffff", accent: "#E01A4F" },
  { id: "neon-frost",    name: "Neon Frost",    bg: "#f0f6fb", card: "#ffffff", accent: "#0284C7" },
  { id: "cyber-quartz",  name: "Cyber Quartz",  bg: "#f4f0fb", card: "#ffffff", accent: "#7B2CBF" },
  { id: "digital-mint",  name: "Digital Mint",  bg: "#f0faf6", card: "#ffffff", accent: "#059669" },
];

function ThemeCard({ theme, active, onSelect }: { theme: ThemeOption; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "border-primary shadow-lg scale-[1.03]" : "border-transparent hover:border-border"
      }`}
      title={theme.name}
    >
      {/* Mini preview */}
      <div className="w-full aspect-[4/3] flex" style={{ background: theme.bg }}>
        {/* Sidebar strip */}
        <div className="w-1/4 h-full flex flex-col gap-1 p-1.5" style={{ background: theme.card }}>
          <div className="h-1.5 rounded-sm w-3/4" style={{ background: theme.accent, opacity: 0.9 }} />
          <div className="h-1 rounded-sm w-full" style={{ background: theme.accent, opacity: 0.3 }} />
          <div className="h-1 rounded-sm w-5/6" style={{ background: theme.accent, opacity: 0.3 }} />
          <div className="h-1 rounded-sm w-full" style={{ background: theme.accent, opacity: 0.3 }} />
        </div>
        {/* Content area */}
        <div className="flex-1 p-1.5 flex flex-col gap-1.5">
          <div className="rounded h-4" style={{ background: theme.card }} />
          <div className="rounded h-2 w-3/4" style={{ background: theme.accent, opacity: 0.5 }} />
          <div className="rounded h-2 w-full" style={{ background: theme.card }} />
          <div className="rounded h-2 w-5/6" style={{ background: theme.card }} />
          <div className="mt-auto rounded-sm px-2 py-0.5 text-[6px] font-bold self-start" style={{ background: theme.accent, color: "#fff" }}>
            BTN
          </div>
        </div>
      </div>
      {/* Label */}
      <div className="px-2 py-1 text-[11px] font-medium text-center truncate" style={{ background: theme.card, color: theme.accent }}>
        {theme.name}
      </div>
      {active && (
        <div className="absolute top-1.5 right-1.5">
          <CheckCircle2Icon className="size-3.5" style={{ color: theme.accent }} />
        </div>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { colorTheme, setColorTheme } = useColorTheme();
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
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Personalize a aparencia e configure a API de IA.
        </p>
      </div>

      <Separator />

      {/* Theme Picker */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <PaletteIcon className="size-5" />
            Tema
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Escolha um tema Opera GX ou use o padrao do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-3 sm:px-6">
          {/* Dark themes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Escuros</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DARK_THEMES.map((t) => (
                <ThemeCard key={t.id} theme={t} active={colorTheme === t.id} onSelect={() => setColorTheme(t.id)} />
              ))}
            </div>
          </div>

          {/* Light themes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Claros</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LIGHT_THEMES.map((t) => (
                <ThemeCard key={t.id} theme={t} active={colorTheme === t.id} onSelect={() => setColorTheme(t.id)} />
              ))}
            </div>
          </div>

          {/* Reset */}
          {colorTheme !== "none" && (
            <button
              type="button"
              onClick={() => setColorTheme("none")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Usar tema padrao do sistema
            </button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* AI Config */}
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
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
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
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
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
