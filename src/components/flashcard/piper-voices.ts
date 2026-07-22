// Catálogo das vozes neurais do Piper, espelhando piper/server.py (VOICES). Fixas
// pela imagem do container, então a lista é estática aqui — sem chamada de rede na
// tela de ajustes. Se as vozes do container mudarem, atualize os dois lugares.
//
// Módulo-folha de propósito: não importa de speech-settings (evita ciclo). Define
// o próprio idioma; "pt-BR"/"en-US" são um subconjunto de SpeechLang.
export type PiperLang = "pt-BR" | "en-US";

export interface PiperVoice {
  id: string;
  lang: PiperLang;
  label: string;
}

// pt-BR só tem vozes masculinas no Piper oficial (ver comentário em server.py).
export const PIPER_VOICES: PiperVoice[] = [
  { id: "pt_BR-faber-medium", lang: "pt-BR", label: "Faber — pt-BR (masculina)" },
  { id: "pt_BR-cadu-medium", lang: "pt-BR", label: "Cadu — pt-BR (masculina)" },
  { id: "pt_BR-jeff-medium", lang: "pt-BR", label: "Jeff — pt-BR (masculina)" },
  { id: "pt_BR-edresson-low", lang: "pt-BR", label: "Edresson — pt-BR (masculina)" },
  { id: "en_US-amy-medium", lang: "en-US", label: "Amy — en-US (feminina)" },
  { id: "en_US-ryan-medium", lang: "en-US", label: "Ryan — en-US (masculina)" },
];

export const DEFAULT_PIPER_VOICE = "pt_BR-faber-medium";

export const isPiperVoice = (value: unknown): value is string =>
  PIPER_VOICES.some((voice) => voice.id === value);

/** Idioma da voz escolhida (para o texto de teste soar coerente). */
export function piperVoiceLang(voiceId: string): PiperLang {
  return PIPER_VOICES.find((voice) => voice.id === voiceId)?.lang ?? "pt-BR";
}
