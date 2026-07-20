"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2Icon, CheckCircle2Icon } from "lucide-react";
import { useSpeech } from "@/components/flashcard/useSpeech";
import {
  loadSpeechSettings,
  saveSpeechSettings,
  SPEECH_LANGS,
  MIN_RATE,
  MAX_RATE,
  type SpeechLang,
  type SpeechSettings,
} from "@/components/flashcard/speech-settings";

// Amostra por idioma, para o "testar" soar no idioma escolhido (com "auto" o
// palpite do speech-text acerta o português).
const SAMPLE: Record<SpeechLang, string> = {
  auto: "Esta é a velocidade da leitura em voz alta.",
  "pt-BR": "Esta é a velocidade da leitura em voz alta.",
  "en-US": "This is the reading speed for text to speech.",
  "ja-JP": "これは読み上げの速さです。",
};

export function SpeechSection() {
  const [settings, setSettings] = useState<SpeechSettings>(loadSpeechSettings);
  const speech = useSpeech();

  // Salva a cada mudança: o hook lê do disco na hora do clique, então o "testar"
  // (e qualquer flashcard) já usa o novo valor sem sincronizar estado.
  const patch = (p: Partial<SpeechSettings>): void => {
    const next = { ...settings, ...p };
    setSettings(next);
    saveSpeechSettings(next);
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Volume2Icon className="size-5" />
          Leitura em voz alta
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Ao estudar, clique na pergunta ou na resposta para ouvir. Aqui você ajusta a
          velocidade e o idioma da voz.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-5">
        {!speech.supported && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Este dispositivo não tem síntese de voz — a leitura fica indisponível.
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="speech-rate" className="text-sm font-medium">Velocidade</label>
            <span className="text-xs tabular-nums text-muted-foreground">{settings.rate.toFixed(2)}×</span>
          </div>
          <input
            id="speech-rate"
            type="range"
            min={MIN_RATE}
            max={MAX_RATE}
            step={0.25}
            value={settings.rate}
            onChange={(e) => patch({ rate: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!speech.supported}
            onClick={() => speech.toggle("test", SAMPLE[settings.lang])}
          >
            <Volume2Icon className="size-4" />
            {speech.speakingId === "test" ? "Parar" : "Testar"}
          </Button>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Idioma da voz</span>
          {SPEECH_LANGS.map((opt) => {
            const ativo = settings.lang === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ lang: opt.id })}
                aria-pressed={ativo}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                  ativo ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <CheckCircle2Icon className={`size-4 shrink-0 ${ativo ? "text-primary" : "text-muted-foreground/30"}`} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
