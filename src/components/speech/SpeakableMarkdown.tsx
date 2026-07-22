"use client";

import { MarkdownContent } from "@/components/markdown-content";
import type { SpeechControls } from "./useSpeech";

// Corpo em Markdown que fala ao ser clicado. O markdown tem blocos, então NÃO
// pode ir dentro de <button>: é uma div clicável (o clique fala e o texto ainda
// pode ser selecionado normalmente). Compartilha o controle de fala da tela.
export function SpeakableMarkdown({
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
  return (
    <div
      className={`${className} ${speech.supported ? "cursor-pointer" : ""}`}
      onClick={() => speech.supported && speech.toggle(id, text)}
    >
      <MarkdownContent>{text}</MarkdownContent>
    </div>
  );
}
