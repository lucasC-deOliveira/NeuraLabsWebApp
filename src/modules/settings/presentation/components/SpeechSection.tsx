"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2Icon, CheckCircle2Icon, SparklesIcon } from "lucide-react";
import { useSpeech } from "@/components/speech/useSpeech";
import {
  loadSpeechSettings,
  saveSpeechSettings,
  SPEECH_LANGS,
  MIN_RATE,
  MAX_RATE,
  type SpeechEngine,
  type SpeechLang,
  type SpeechSettings,
} from "@/components/speech/speech-settings";
import { PIPER_VOICES, piperVoiceLang } from "@/components/speech/piper-voices";

// Amostra por idioma, para o "testar" soar no idioma escolhido (com "auto" o
// palpite do speech-text acerta o português).
const SAMPLE: Record<SpeechLang, string> = {
  auto: "Esta é a velocidade da leitura em voz alta.",
  "pt-BR": "Esta é a velocidade da leitura em voz alta.",
  "en-US": "This is the reading speed for text to speech.",
  "ja-JP": "これは読み上げの速さです。",
};

// Texto de teste coerente com o que vai soar: no Piper o idioma vem da voz.
function sampleFor(settings: SpeechSettings): string {
  const lang = settings.engine === "piper" ? piperVoiceLang(settings.voice) : settings.lang;
  return SAMPLE[lang];
}

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
          Ao estudar, clique na pergunta ou na resposta para ouvir. Aqui você escolhe a
          voz, a velocidade e o idioma.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-5">
        {!speech.supported && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Este dispositivo não consegue reproduzir áudio — a leitura fica indisponível.
          </p>
        )}

        <EngineToggle engine={settings.engine} onChange={(engine) => patch({ engine })} />

        <RateControl
          settings={settings}
          disabled={!speech.supported}
          speakingTest={speech.speakingId === "test"}
          onRate={(rate) => patch({ rate })}
          onTest={() => speech.toggle("test", sampleFor(settings))}
        />

        {settings.engine === "piper" ? (
          <VoicePicker voice={settings.voice} onPick={(voice) => patch({ voice })} />
        ) : (
          <LangPicker lang={settings.lang} onPick={(lang) => patch({ lang })} />
        )}
      </CardContent>
    </Card>
  );
}

function EngineToggle({ engine, onChange }: { engine: SpeechEngine; onChange: (e: SpeechEngine) => void }) {
  const options: { id: SpeechEngine; label: string; hint: string }[] = [
    { id: "system", label: "Voz do sistema", hint: "Rápida, offline no navegador" },
    { id: "piper", label: "Voz natural (Piper)", hint: "Mais natural, via servidor" },
  ];
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Tipo de voz</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const ativo = engine === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={ativo}
              className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${
                ativo ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {opt.id === "piper" && <SparklesIcon className="size-3.5 text-primary" />}
                {opt.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RateControl({
  settings,
  disabled,
  speakingTest,
  onRate,
  onTest,
}: {
  settings: SpeechSettings;
  disabled: boolean;
  speakingTest: boolean;
  onRate: (rate: number) => void;
  onTest: () => void;
}) {
  return (
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
        onChange={(e) => onRate(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <Button variant="outline" size="sm" className="gap-2" disabled={disabled} onClick={onTest}>
        <Volume2Icon className="size-4" />
        {speakingTest ? "Parar" : "Testar"}
      </Button>
    </div>
  );
}

function VoicePicker({ voice, onPick }: { voice: string; onPick: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Voz do Piper</span>
      {PIPER_VOICES.map((opt) => (
        <PickRow key={opt.id} label={opt.label} active={voice === opt.id} onClick={() => onPick(opt.id)} />
      ))}
    </div>
  );
}

function LangPicker({ lang, onPick }: { lang: SpeechLang; onPick: (id: SpeechLang) => void }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Idioma da voz</span>
      {SPEECH_LANGS.map((opt) => (
        <PickRow key={opt.id} label={opt.label} active={lang === opt.id} onClick={() => onPick(opt.id)} />
      ))}
    </div>
  );
}

function PickRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <CheckCircle2Icon className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground/30"}`} />
      {label}
    </button>
  );
}
