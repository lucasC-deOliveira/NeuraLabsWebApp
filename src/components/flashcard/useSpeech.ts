import { useCallback, useEffect, useRef, useState } from "react";
import { guessSpeechLang, stripMarkdown } from "./speech-text";
import { loadSpeechSettings, type SpeechSettings } from "./speech-settings";
import { synthesizeSpeech } from "@/lib/tts-api";

// Fala texto do flashcard. Dois motores (ver speech-settings):
//  - "system": Web Speech API (Chromium/Electron), o padrão histórico.
//  - "piper": voz neural natural via backend; toca o WAV retornado. Se o Piper
//    estiver indisponível, cai para a voz do sistema — um clique sempre fala.
// Um id por trecho (pergunta/resposta) para a UI saber o que está falando e
// alternar: clicar de novo no mesmo trecho para; clicar em outro troca.
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const canPlayAudio = typeof window !== "undefined" && typeof Audio !== "undefined";

  const teardown = useCallback((): void => {
    synth?.cancel();
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, [synth]);

  // Cancela a fala ao desmontar: sair da tela não deixa voz solta.
  useEffect(() => teardown, [teardown]);

  const clearIfCurrent = (id: string): void =>
    setSpeakingId((cur) => (cur === id ? null : cur));

  const stop = (): void => {
    activeIdRef.current = null;
    teardown();
    setSpeakingId(null);
  };

  const speakSystem = (id: string, clean: string, prefs: SpeechSettings): void => {
    if (!synth) return clearIfCurrent(id);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = prefs.lang === "auto" ? guessSpeechLang(clean) : prefs.lang;
    utter.rate = prefs.rate;
    utter.onend = () => clearIfCurrent(id);
    utter.onerror = () => clearIfCurrent(id);
    synth.speak(utter);
  };

  const speakPiper = async (id: string, clean: string, prefs: SpeechSettings): Promise<void> => {
    try {
      const blob = await synthesizeSpeech({ text: clean, voice: prefs.voice, rate: prefs.rate });
      if (activeIdRef.current !== id) return; // usuário trocou/parou durante a rede
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => clearIfCurrent(id);
      audio.onerror = () => clearIfCurrent(id);
      await audio.play();
    } catch {
      // Piper fora do ar: cai para a voz do sistema para o clique ainda falar.
      if (activeIdRef.current === id) speakSystem(id, clean, prefs);
    }
  };

  const toggle = (id: string, text: string): void => {
    if (speakingId === id) return stop();
    teardown();
    const clean = stripMarkdown(text);
    if (!clean) return;
    const prefs = loadSpeechSettings();
    activeIdRef.current = id;
    setSpeakingId(id);
    // O Piper não tem voz japonesa (ver piper/Dockerfile) — texto em japonês fica
    // com a voz do sistema mesmo no modo Piper.
    const usePiper = prefs.engine === "piper" && guessSpeechLang(clean) !== "ja-JP";
    if (usePiper) void speakPiper(id, clean, prefs);
    else speakSystem(id, clean, prefs);
  };

  return { supported: Boolean(synth) || canPlayAudio, speakingId, toggle, stop };
}
