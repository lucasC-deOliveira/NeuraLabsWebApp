// Preferência de leitura em voz alta (velocidade + idioma), no localStorage — do
// aparelho, não da conta, como as outras preferências do flashcard. O idioma
// "auto" mantém o palpite por trecho (ver speech-text); os demais forçam a voz.

import { DEFAULT_PIPER_VOICE, isPiperVoice } from "./piper-voices";

export type SpeechLang = "auto" | "pt-BR" | "en-US" | "ja-JP";

// "system": voz do navegador (Web Speech API), o padrão histórico.
// "piper": voz neural natural via container Piper (proxy pelo backend).
export type SpeechEngine = "system" | "piper";

export interface SpeechSettings {
  // Multiplicador de velocidade (rate). 1 = normal. Vale para os dois motores.
  rate: number;
  // Idioma da voz do sistema. No Piper o idioma vem da voz escolhida (voice).
  lang: SpeechLang;
  engine: SpeechEngine;
  // Voz do Piper (ex.: "pt_BR-faber-medium"). Só usada quando engine === "piper".
  voice: string;
}

export const SPEECH_LANGS: { id: SpeechLang; label: string }[] = [
  { id: "auto", label: "Automático (detecta pt / en / ja)" },
  { id: "pt-BR", label: "Português" },
  { id: "en-US", label: "Inglês" },
  { id: "ja-JP", label: "Japonês" },
];

// A Web Speech aceita 0.1–10, mas fora de ~0.5–2 fica ininteligível.
export const MIN_RATE = 0.5;
export const MAX_RATE = 2;
export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  rate: 1,
  lang: "auto",
  engine: "system",
  voice: DEFAULT_PIPER_VOICE,
};

const KEY = "neuralabs.speech";

const isLang = (v: unknown): v is SpeechLang => SPEECH_LANGS.some((l) => l.id === v);
const isEngine = (v: unknown): v is SpeechEngine => v === "system" || v === "piper";

// Grampeia a velocidade e valida idioma/motor/voz — um valor estranho no disco
// (ou uma versão antiga, sem os campos novos) não deve produzir fala quebrada.
export function normalizeSpeechSettings(raw: unknown): SpeechSettings {
  const obj = (raw ?? {}) as Partial<SpeechSettings>;
  const rate = typeof obj.rate === "number" ? Math.min(MAX_RATE, Math.max(MIN_RATE, obj.rate)) : 1;
  return {
    rate,
    lang: isLang(obj.lang) ? obj.lang : "auto",
    engine: isEngine(obj.engine) ? obj.engine : "system",
    voice: isPiperVoice(obj.voice) ? obj.voice : DEFAULT_PIPER_VOICE,
  };
}

/** Preferência salva, ou o padrão. Disco corrompido cai no padrão. */
export function loadSpeechSettings(): SpeechSettings {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? normalizeSpeechSettings(JSON.parse(saved)) : DEFAULT_SPEECH_SETTINGS;
  } catch {
    return DEFAULT_SPEECH_SETTINGS;
  }
}

export function saveSpeechSettings(settings: SpeechSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // sem onde guardar (modo privado): vale só para esta sessão.
  }
}
