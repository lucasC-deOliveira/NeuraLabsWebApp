"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { WandSparklesIcon, CheckCircle2Icon } from "lucide-react";
import { useCardStyle } from "@/components/flashcard/CardStyleProvider";
import { CARD_STYLES, CARD_CSS_CLASSES } from "@/components/flashcard/card-styles";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { CardFramePicker } from "./CardFramePicker";

export function CardStyleSection() {
  const { styleId, setStyleId, customCss, setCustomCss } = useCardStyle();
  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <WandSparklesIcon className="size-5" />
          Estilo do flashcard
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Escolha um estilo de card, uma moldura ou personalize o CSS. Vale para todos os
          flashcards, inclusive no estudo.
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

        {/* moldura: preferência independente do estilo */}
        <CardFramePicker />

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
  );
}
