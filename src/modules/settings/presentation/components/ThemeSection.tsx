"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaletteIcon, CheckIcon, CheckCircle2Icon } from "lucide-react";
import { useColorTheme } from "@/components/color-theme-provider";
import { DARK_THEMES, LIGHT_THEMES, type ThemeOption } from "../constants/theme-catalog";

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

export function ThemeSection() {
  const { colorTheme, setColorTheme, neonEnabled, setNeonEnabled } = useColorTheme();
  return (
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
  );
}
