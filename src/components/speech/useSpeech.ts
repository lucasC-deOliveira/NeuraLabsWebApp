import { useCallback, useEffect, useRef, useState } from "react";
import { guessSpeechLang, stripMarkdown } from "./speech-text";
import { splitSentences } from "./sentence-split";
import { segmentByLang } from "./lang-segments";
import { loadSpeechSettings, type SpeechSettings } from "./speech-settings";
import { synthesizeSpeech } from "@/lib/tts-api";

// Fala texto do flashcard/nota/questão FRASE A FRASE, expondo qual frase está
// tocando (sentenceIndex) para a UI destacar como num leitor de livro. Dois motores:
//  - "system": Web Speech API (Chromium/Electron), o padrão histórico.
//  - "piper": voz neural natural via backend; sintetiza e toca cada frase.
//    Se o Piper falhar numa frase, ela cai para a voz do sistema.
// Um id por trecho (pergunta/resposta/nota/…) para a UI saber o que fala e alternar.
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const genRef = useRef(0); // token de geração: invalida a fila anterior ao parar/trocar
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

  const stop = (): void => {
    genRef.current++;
    teardown();
    setSpeakingId(null);
    setSentenceIndex(0);
  };

  // Fala UMA frase, resolvendo quando ela termina (ou em erro). Japonês sempre usa
  // a voz do sistema (o Piper não tem voz JP — ver piper/Dockerfile).
  const playSentence = (sentence: string, prefs: SpeechSettings, gen: number): Promise<void> => {
    const usePiper = prefs.engine === "piper" && guessSpeechLang(sentence) !== "ja-JP";
    return usePiper ? playPiper(sentence, prefs, gen) : playSystem(sentence, prefs, gen);
  };

  // Voz do sistema. No modo "auto", quebra a frase em trechos por idioma (termo
  // técnico em inglês, resto em português) e fala cada um com sua voz — assim
  // "heap como funciona" soa "heap" (inglês) + "como funciona" (português).
  const playSystem = async (sentence: string, prefs: SpeechSettings, gen: number): Promise<void> => {
    if (!synth) return;
    const segments =
      prefs.lang === "auto" ? segmentByLang(sentence) : [{ text: sentence, lang: prefs.lang }];
    for (const segment of segments) {
      if (genRef.current !== gen) return;
      await speakUtterance(segment.text, segment.lang, prefs.rate);
    }
  };

  const speakUtterance = (text: string, lang: string, rate: number): Promise<void> =>
    new Promise((resolve) => {
      if (!synth) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = rate;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      synth.speak(utter);
    });

  const playPiper = async (sentence: string, prefs: SpeechSettings, gen: number): Promise<void> => {
    let blob: Blob;
    try {
      blob = await synthesizeSpeech({ text: sentence, voice: prefs.voice, rate: prefs.rate });
    } catch {
      return playSystem(sentence, prefs, gen); // Piper fora do ar: cai para o sistema
    }
    if (genRef.current !== gen) return;
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = (): void => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      void audio.play().catch(done);
    });
  };

  // Sempre inicia a leitura do trecho (não alterna). Divide em frases e as toca em
  // sequência, atualizando sentenceIndex. Usado pelo clique e pelo auto-read.
  const speak = (id: string, text: string): void => {
    teardown();
    const sentences = splitSentences(stripMarkdown(text));
    if (!sentences.length) return;
    const gen = ++genRef.current;
    const prefs = loadSpeechSettings();
    setSpeakingId(id);
    setSentenceIndex(0);
    void playQueue(id, sentences, prefs, gen);
  };

  const playQueue = async (
    id: string,
    sentences: string[],
    prefs: SpeechSettings,
    gen: number,
  ): Promise<void> => {
    for (let i = 0; i < sentences.length; i++) {
      if (genRef.current !== gen) return; // parou ou trocou de trecho
      setSentenceIndex(i);
      await playSentence(sentences[i], prefs, gen);
    }
    if (genRef.current === gen) {
      setSpeakingId(null);
      setSentenceIndex(0);
    }
  };

  const toggle = (id: string, text: string): void => {
    if (speakingId === id) return stop();
    speak(id, text);
  };

  return { supported: Boolean(synth) || canPlayAudio, speakingId, sentenceIndex, toggle, stop, speak };
}

// Controle de fala compartilhado por uma tela: instancie useSpeech() uma vez e
// passe isto aos SpeakButton/SpokenText (um único speakingId + sentenceIndex coordena todos).
export type SpeechControls = ReturnType<typeof useSpeech>;
