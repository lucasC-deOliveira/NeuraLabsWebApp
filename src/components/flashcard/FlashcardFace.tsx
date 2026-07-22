"use client";

import { useSpeech, type SpeechControls } from "@/components/speech/useSpeech";
import { SpeakButton } from "@/components/speech/SpeakButton";
import { SpeakableMarkdown } from "@/components/speech/SpeakableMarkdown";

// Face do flashcard compartilhada entre estudar/ver. As classes .fc-* são os
// pontos de customização (presets ou CSS personalizado em CardStyleProvider);
// as classes Tailwind dão o visual padrão ("Clássico") quando não há CSS extra.
//
// Clicar na pergunta ou na resposta lê o texto em voz alta (ver @/components/speech);
// clicar de novo para. Idioma/voz conforme os ajustes de leitura.
export function FlashcardFace({
  pergunta,
  resposta,
  conceito,
  showAnswer,
  speech: sharedSpeech,
}: {
  pergunta: string;
  resposta: string;
  conceito?: string | null;
  showAnswer: boolean;
  // Controle de fala compartilhado pela tela (ex.: sessão de estudo, para coordenar
  // com o auxílio de IA). Sem prop, o card usa a própria instância.
  speech?: SpeechControls;
}) {
  const ownSpeech = useSpeech();
  const speech = sharedSpeech ?? ownSpeech;

  return (
    <div className="fc-scope">
      <div className="fc-card flex flex-col gap-4">
        <div className="fc-pergunta rounded-xl border bg-card p-4">
          <FaceLabel label="Pergunta" id="pergunta" text={pergunta} speech={speech} tone="text-muted-foreground" />
          <SpeakableMarkdown id="pergunta" text={pergunta} speech={speech} className="fc-pergunta-body mt-1 text-base font-medium" />
        </div>

        {showAnswer && (
          <div className="fc-resposta rounded-xl border border-primary/30 bg-muted/40 p-4">
            <FaceLabel label="Resposta" id="resposta" text={resposta} speech={speech} tone="text-primary" />
            <SpeakableMarkdown id="resposta" text={resposta} speech={speech} className="fc-resposta-body mt-1 text-sm" />
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

// Rótulo + botão de som (a affordance acessível e explícita da leitura).
function FaceLabel({ label, id, text, speech, tone }: { label: string; id: string; text: string; speech: SpeechControls; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`fc-label text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{label}</span>
      <SpeakButton speech={speech} id={id} text={text} label={`a ${label.toLowerCase()}`} />
    </div>
  );
}
