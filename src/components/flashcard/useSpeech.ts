import { useEffect, useState } from "react";
import { guessSpeechLang, stripMarkdown } from "./speech-text";
import { loadSpeechSettings } from "./speech-settings";

// Fala texto do flashcard via Web Speech API (Chromium/Electron). Um id por trecho
// (pergunta/resposta) para a UI saber o que está falando e alternar: clicar de
// novo no mesmo trecho para; clicar em outro troca. Sem TTS no ambiente, o hook
// simplesmente não fala e `supported` fica false.
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

  // Cancela a fala ao desmontar: sair da tela não deixa voz solta.
  useEffect(() => {
    return () => synth?.cancel();
  }, [synth]);

  const stop = (): void => {
    synth?.cancel();
    setSpeakingId(null);
  };

  const toggle = (id: string, text: string): void => {
    if (!synth) return;
    // Clicar no que já está falando: para (toggle).
    if (speakingId === id) { stop(); return; }
    synth.cancel();
    const clean = stripMarkdown(text);
    if (!clean) return;
    // Lida na hora do clique: mudar a preferência vale já na próxima fala, sem
    // recriar o hook nem sincronizar estado.
    const prefs = loadSpeechSettings();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = prefs.lang === "auto" ? guessSpeechLang(clean) : prefs.lang;
    utter.rate = prefs.rate;
    utter.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    utter.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    setSpeakingId(id);
    synth.speak(utter);
  };

  return { supported: Boolean(synth), speakingId, toggle, stop };
}
