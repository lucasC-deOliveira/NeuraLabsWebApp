"use client";

import { Volume2Icon, SquareIcon } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { useSpeech } from "./useSpeech";

// Face do flashcard compartilhada entre estudar/ver. As classes .fc-* são os
// pontos de customização (presets ou CSS personalizado em CardStyleProvider);
// as classes Tailwind dão o visual padrão ("Clássico") quando não há CSS extra.
//
// Clicar na pergunta ou na resposta lê o texto em voz alta (Web Speech API);
// clicar de novo para. Idioma chutado por trecho (pt/en/ja), ver speech-text.
export function FlashcardFace({
  pergunta,
  resposta,
  conceito,
  showAnswer,
}: {
  pergunta: string;
  resposta: string;
  conceito?: string | null;
  showAnswer: boolean;
}) {
  const speech = useSpeech();

  return (
    <div className="fc-scope">
      <div className="fc-card flex flex-col gap-4">
        <div className="fc-pergunta rounded-xl border bg-card p-4">
          <FaceLabel label="Pergunta" id="pergunta" text={pergunta} speech={speech} tone="text-muted-foreground" />
          <SpeakBody id="pergunta" text={pergunta} speech={speech} bodyClass="fc-pergunta-body mt-1 text-base font-medium" />
        </div>

        {showAnswer && (
          <div className="fc-resposta rounded-xl border border-primary/30 bg-muted/40 p-4">
            <FaceLabel label="Resposta" id="resposta" text={resposta} speech={speech} tone="text-primary" />
            <SpeakBody id="resposta" text={resposta} speech={speech} bodyClass="fc-resposta-body mt-1 text-sm" />
            {conceito && (
              <p className="fc-conceito mt-2 text-xs font-medium text-muted-foreground">
                Conceito: {conceito}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Speech = ReturnType<typeof useSpeech>;

// Rótulo + botão de som (a affordance acessível e explícita da leitura).
function FaceLabel({ label, id, text, speech, tone }: { label: string; id: string; text: string; speech: Speech; tone: string }) {
  const speaking = speech.speakingId === id;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`fc-label text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{label}</span>
      {speech.supported && (
        <button
          type="button"
          aria-label={speaking ? `Parar leitura da ${label.toLowerCase()}` : `Ouvir a ${label.toLowerCase()}`}
          onClick={() => speech.toggle(id, text)}
          className={`shrink-0 rounded p-1 transition-colors ${speaking ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {speaking ? <SquareIcon className="size-3.5 fill-current" /> : <Volume2Icon className="size-4" />}
        </button>
      )}
    </div>
  );
}

// O corpo é markdown (blocos), então NÃO pode ir dentro de <button>. Div clicável:
// clicar fala; o clique também deixa o texto ser selecionado normalmente.
function SpeakBody({ id, text, speech, bodyClass }: { id: string; text: string; speech: Speech; bodyClass: string }) {
  return (
    <div
      className={`${bodyClass} ${speech.supported ? "cursor-pointer" : ""}`}
      onClick={() => speech.supported && speech.toggle(id, text)}
    >
      <MarkdownContent>{text}</MarkdownContent>
    </div>
  );
}
