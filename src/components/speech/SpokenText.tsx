"use client";

import { MarkdownContent } from "@/components/markdown-content";
import { stripMarkdown } from "./speech-text";
import { splitSentences } from "./sentence-split";
import type { SpeechControls } from "./useSpeech";

// Texto que fala ao clicar e, ENQUANTO está sendo lido, destaca a frase atual
// (estilo leitor de livro). Fora da leitura, renderiza markdown normal; durante a
// leitura, mostra as frases em texto puro com a atual acesa. Usa o MESMO splitter
// do motor (useSpeech), então a frase destacada é exatamente a que está tocando.
export function SpokenText({
  speech,
  id,
  text,
  className = "",
}: {
  speech: SpeechControls;
  id: string;
  text: string;
  className?: string;
}) {
  const reading = speech.speakingId === id;
  if (!reading) {
    return (
      <div
        className={`${className} ${speech.supported ? "cursor-pointer" : ""}`}
        onClick={() => speech.supported && speech.toggle(id, text)}
      >
        <MarkdownContent>{text}</MarkdownContent>
      </div>
    );
  }
  const sentences = splitSentences(stripMarkdown(text));
  return (
    <div className={`${className} cursor-pointer`} onClick={() => speech.toggle(id, text)}>
      {sentences.map((sentence, i) => (
        <span
          key={i}
          className={
            i === speech.sentenceIndex
              ? "rounded bg-primary/25 text-foreground"
              : "text-muted-foreground/70"
          }
        >
          {sentence}{" "}
        </span>
      ))}
    </div>
  );
}
