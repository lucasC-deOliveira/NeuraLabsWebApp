"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SettingsIcon, EyeIcon, EyeOffIcon, CheckCircle2Icon, PaletteIcon, CheckIcon, WandSparklesIcon, FolderTreeIcon, FolderOpenIcon, TerminalIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { getConfigAI, saveConfigAI } from "@/lib/settings-api";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { useColorTheme, type ColorTheme } from "@/components/color-theme-provider";
import { useCardStyle } from "@/components/flashcard/CardStyleProvider";
import { CARD_STYLES, CARD_CSS_CLASSES } from "@/components/flashcard/card-styles";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";

type ThemeOption = { id: ColorTheme; name: string; bg: string; card: string; accent: string };

const DARK_THEMES: ThemeOption[] = [
  { id: "classic-gx",        name: "Classic",           bg: "#1a0a0a", card: "#260f0f", accent: "#FA1E4E" },
  { id: "cyber-ultraviolet", name: "Cyber Ultraviolet", bg: "#0f0a1a", card: "#160f26", accent: "#9D4EDD" },
  { id: "chroma-teal",       name: "Chroma Teal",       bg: "#091a19", card: "#0f2625", accent: "#00F5D4" },
  { id: "acid-toxic",        name: "Acid Toxic",        bg: "#091409", card: "#0e1f0e", accent: "#39FF14" },
  { id: "purple-haze",       name: "Purple Haze",       bg: "#18151d", card: "#221d2b", accent: "#6B4DAB" },
  { id: "subzero",           name: "Subzero",           bg: "#12161d", card: "#1a2330", accent: "#00C8FF" },
  { id: "rose-quartz",       name: "Rose Quartz",       bg: "#1a171b", card: "#242028", accent: "#F7CAC9" },
  { id: "white-wolf",        name: "White Wolf",        bg: "#121212", card: "#1c1c1c", accent: "#E6E6E6" },
  { id: "cyberpunk-neon",    name: "Cyberpunk Neon",    bg: "#0b0f1a", card: "#161b2d", accent: "#FF008C" },
  { id: "cyberpunk-2077",    name: "Cyberpunk 2077",    bg: "#0f0f0a", card: "#1a1a0d", accent: "#FCEE0A" },
  { id: "jinx",              name: "Jinx",              bg: "#C000B2", card: "#1a1f2b", accent: "#00AEEF" },
  { id: "hackerman",         name: "Hackerman",         bg: "#0b0c16", card: "#1a1d2b", accent: "#28C23C" },
];

const LIGHT_THEMES: ThemeOption[] = [
  { id: "light-gx-core", name: "Light Core", bg: "#fafafa", card: "#ffffff", accent: "#E01A4F" },
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
  const { colorTheme, setColorTheme, neonEnabled, setNeonEnabled } = useColorTheme();
  const { styleId, setStyleId, customCss, setCustomCss } = useCardStyle();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelo, setModelo] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Vault e Claude Code (só no app desktop)
  const desktopApp = isDesktop();
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [claudeCodeEnabled, setClaudeCodeEnabled] = useState(false);
  const [claudeCodeLoading, setClaudeCodeLoading] = useState(false);

  useEffect(() => {
    if (!desktopApp) return;
    desktop.vault.getPath().then(setVaultPath).catch(() => {});
    desktop.claudeCode.getConfig().then((cfg) => setClaudeCodeEnabled(cfg.enabled)).catch(() => {});
  }, [desktopApp]);

  const pickVaultFolder = async () => {
    try {
      const dir = await desktop.vault.pickFolder();
      if (dir) {
        setVaultPath(dir);
        toast.success("Pasta do vault definida.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao escolher a pasta.");
    }
  };

  const handleToggleClaudeCode = async () => {
    if (!desktopApp) return;
    const enabling = !claudeCodeEnabled;
    setClaudeCodeLoading(true);
    try {
      if (enabling) {
        const savedConfig = { apiKey, baseUrl, modelo };
        await desktop.claudeCode.setEnabled(true, savedConfig);
        await saveConfigAI({
          apiKey: "claude-code",
          baseUrl: "http://host.docker.internal:11435/v1",
          modelo: "claude-code",
        });
        setClaudeCodeEnabled(true);
        toast.success("Claude Code ativado. As chamadas de IA usarão o claude local.");
      } else {
        const result = await desktop.claudeCode.setEnabled(false);
        const saved = result.savedApiConfig;
        if (saved) {
          await saveConfigAI(saved);
          setApiKey(saved.apiKey);
          setBaseUrl(saved.baseUrl);
          setModelo(saved.modelo);
        }
        setClaudeCodeEnabled(false);
        toast.success("Claude Code desativado. Usando a API configurada.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alternar Claude Code.");
    } finally {
      setClaudeCodeLoading(false);
    }
  };

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
            Escolha um tema de cor ou use o padrao do sistema.
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

          {/* Efeito neon na sidebar */}
          <label className="flex w-fit cursor-pointer select-none items-center gap-3">
            <input
              type="checkbox"
              className="sr-only"
              checked={neonEnabled}
              onChange={(e) => setNeonEnabled(e.target.checked)}
            />
            <span
              className={`flex size-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                neonEnabled
                  ? "border-primary bg-primary/15 shadow-[0_0_10px_2px_var(--primary)]"
                  : "border-muted-foreground/40 hover:border-primary/60"
              }`}
            >
              {neonEnabled && <CheckIcon className="size-3.5 text-primary drop-shadow-[0_0_4px_var(--primary)]" />}
            </span>
            <span className={`text-sm transition-all ${neonEnabled ? "text-primary drop-shadow-[0_0_6px_var(--primary)]" : ""}`}>
              Efeito neon na sidebar
            </span>
          </label>

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

      {/* Estilo do flashcard (nível Anki) */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <WandSparklesIcon className="size-5" />
            Estilo do flashcard
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Escolha um estilo de card ou personalize o CSS. Vale para todos os flashcards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          {/* seletor de presets */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CARD_STYLES.map((s) => {
              const active = styleId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyleId(s.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary shadow-lg scale-[1.03]" : "border-transparent hover:border-border"
                  }`}
                  title={s.name}
                >
                  <div className="aspect-[4/3] p-2 flex" style={{ background: s.swatch.bg }}>
                    <div
                      className="flex-1 rounded-md border p-1.5 flex flex-col gap-1"
                      style={{ background: s.swatch.card, borderColor: s.swatch.accent }}
                    >
                      <div className="h-1 w-1/3 rounded-sm" style={{ background: s.swatch.accent, opacity: 0.7 }} />
                      <div className="h-1.5 w-3/4 rounded-sm" style={{ background: s.swatch.accent, opacity: 0.4 }} />
                      <div className="mt-auto h-1 w-1/4 rounded-sm" style={{ background: s.swatch.accent }} />
                    </div>
                  </div>
                  <div className="px-2 py-1 text-[11px] font-medium text-center truncate bg-card">{s.name}</div>
                  {active && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2Icon className="size-3.5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* editor de CSS (só no Personalizado) */}
          {styleId === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="card-css">CSS personalizado</Label>
              <textarea
                id="card-css"
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                spellCheck={false}
                rows={10}
                maxLength={20000}
                className="w-full rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                placeholder=".fc-card { ... }"
              />
              <p className="text-[11px] text-muted-foreground">
                Classes disponíveis: <span className="font-mono">{CARD_CSS_CLASSES.join(", ")}</span>
              </p>
            </div>
          )}

          {/* preview ao vivo */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Pré-visualização
            </p>
            <div className="rounded-lg border bg-background p-3">
              <FlashcardFace
                pergunta="Qual é a capital da França?"
                resposta="**Paris** — maior cidade e capital da França."
                conceito="Geografia"
                showAnswer
              />
            </div>
          </div>
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
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
                disabled={claudeCodeEnabled}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
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
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
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
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              disabled={claudeCodeEnabled}
            />
            <p className="text-[10px] text-muted-foreground">
              ID do modelo. Ex: {"gpt-4o-mini"}, {"qwen/qwen3.6-plus:free"}, etc.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || claudeCodeEnabled} size="lg" className="w-full">
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

      {/* Vault (Markdown) — só no app desktop */}
      {desktopApp && (
        <>
          <Separator />
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FolderTreeIcon className="size-5" />
                Vault (Markdown)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Pasta local de arquivos Markdown (formato PARA), editável no Obsidian
                ou pelo Claude Code. Define a pasta aqui; a sincronização (Pull/Push)
                é feita por grafo, no botão <strong>Vault</strong> dentro de cada grafo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6">
              <div className="space-y-2">
                <Label>Pasta do vault</Label>
                <div className="flex gap-2">
                  <Input
                    value={vaultPath ?? ""}
                    placeholder="Nenhuma pasta selecionada"
                    readOnly
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={pickVaultFolder} className="shrink-0 gap-1.5">
                    <FolderTreeIcon className="size-4" /> Escolher
                  </Button>
                </div>
              </div>

              {vaultPath && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => desktop.vault.openFolder(vaultPath)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <FolderOpenIcon className="size-4" /> Abrir pasta
                </Button>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Claude Code local */}
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TerminalIcon className="size-5" />
                Claude Code (local)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Usa o <code className="font-mono text-xs">claude</code> instalado localmente em vez de uma API remota.
                Requer autenticação prévia com <code className="font-mono text-xs">claude /login</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div>
                  <p className="text-sm font-medium">Usar Claude Code para IA</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Instale com:{" "}
                    <code className="font-mono">npm install -g @anthropic-ai/claude-code</code>
                  </p>
                </div>
                <div
                  className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
                    claudeCodeEnabled ? "bg-violet-600" : "bg-muted-foreground/30"
                  } ${claudeCodeLoading ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={claudeCodeLoading ? undefined : handleToggleClaudeCode}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      claudeCodeEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>

              {claudeCodeEnabled && (
                <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    Ativo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Proxy rodando em{" "}
                    <code className="font-mono">localhost:{11435}</code>. O backend Docker usa{" "}
                    <code className="font-mono">host.docker.internal:{11435}</code>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verifique se está autenticado:{" "}
                    <code className="font-mono">claude /status</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
