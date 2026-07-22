import { useEffect, useRef } from "react";
import type { SpeechControls } from "./useSpeech";

export interface AutoReadCard {
  id: string;
  pergunta: string;
  resposta: string;
}

// O que ler para cada fase do card. Puro. Usa os mesmos ids do FlashcardFace
// ("pergunta"/"resposta") para o botão de som refletir a leitura automática.
export function autoReadTarget(
  phase: string,
  card: AutoReadCard,
): { id: string; text: string } | null {
  if (phase === "question") return { id: "pergunta", text: card.pergunta };
  if (phase === "answer") return { id: "resposta", text: card.resposta };
  return null;
}

// Leitura automática na sessão de estudo (ver ajustes → autoRead). Ao entrar num
// card (fase "question") lê a pergunta; ao revelar (fase "answer") lê a resposta.
// Não auto-revela nem auto-avalia — respeita a elaboração do aluno. Dispara uma
// vez por transição (card+fase); desligar limpa o gatilho.
export function useAutoRead(
  speech: SpeechControls,
  card: AutoReadCard | null,
  phase: string,
  enabled: boolean,
): void {
  const lastRef = useRef("");
  useEffect(() => {
    if (!enabled || !card) {
      lastRef.current = "";
      return;
    }
    const key = `${card.id}:${phase}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    const target = autoReadTarget(phase, card);
    if (target) speech.speak(target.id, target.text);
    // speech muda de identidade a cada render; depender só da transição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, card?.id, phase]);
}
