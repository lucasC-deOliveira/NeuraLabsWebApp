// Preferência de leitura em voz alta (velocidade + idioma), no localStorage — do
// aparelho, não da conta, como as outras preferências do flashcard. O idioma
// "auto" mantém o palpite por trecho (ver speech-text); os demais forçam a voz.

export type SpeechLang = "auto" | "pt-BR" | "en-US" | "ja-JP";

export interface SpeechSettings {
  // Multiplicador da Web Speech API (rate). 1 = normal.
  rate: number;
  lang: SpeechLang;
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
export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = { rate: 1, lang: "auto" };

const KEY = "neuralabs.speech";

const isLang = (v: unknown): v is SpeechLang => SPEECH_LANGS.some((l) => l.id === v);

// Grampeia a velocidade e valida o idioma — um valor estranho no disco não deve
// produzir uma fala quebrada.
export function normalizeSpeechSettings(raw: unknown): SpeechSettings {
  const obj = (raw ?? {}) as Partial<SpeechSettings>;
  const rate = typeof obj.rate === "number" ? Math.min(MAX_RATE, Math.max(MIN_RATE, obj.rate)) : 1;
  return { rate, lang: isLang(obj.lang) ? obj.lang : "auto" };
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
