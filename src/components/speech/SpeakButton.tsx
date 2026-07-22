"use client";

import { Volume2Icon, SquareIcon } from "lucide-react";
import type { SpeechControls } from "./useSpeech";

// Botão de leitura em voz alta reutilizável por qualquer tela (flashcard, nota,
// questão, modais do grafo). Compartilha o controle de fala da tela via `speech`:
// clicar fala o `text`; clicar de novo para (o mesmo `id`). Some quando não há
// como reproduzir áudio. `label` é a frase do trecho para o aria-label — inclua
// artigo/gênero (ex.: "a pergunta", "o mnemônico") → vira "Ouvir a pergunta".
export function SpeakButton({
  speech,
  id,
  text,
  label,
  className = "",
}: {
  speech: SpeechControls;
  id: string;
  text: string;
  label: string;
  className?: string;
}) {
  if (!speech.supported) return null;
  const speaking = speech.speakingId === id;
  return (
    <button
      type="button"
      aria-label={speaking ? "Parar leitura" : `Ouvir ${label}`}
      onClick={() => speech.toggle(id, text)}
      className={`shrink-0 rounded p-1 transition-colors ${
        speaking ? "text-primary" : "text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      {speaking ? <SquareIcon className="size-3.5 fill-current" /> : <Volume2Icon className="size-4" />}
    </button>
  );
}
