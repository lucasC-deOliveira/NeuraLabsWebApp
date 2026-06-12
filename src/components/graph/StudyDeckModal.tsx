"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, EyeIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { startDeckStudy, submitCardReview, finalizeStudySession } from "@/actions/study";
import type { FlashcardData } from "@/types";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";

interface StudyDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
}

type Phase = "loading" | "question" | "answer" | "confidence" | "saving" | "complete" | "error";

const CONFIDENCE_LABELS = ["Nada", "Pouco", "Neutro", "Confiante", "Muito"];

export function StudyDeckModal({ open, onOpenChange, baralhoId }: StudyDeckModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [titulo, setTitulo] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [index, setIndex] = useState(0);
  const [pendingAcertou, setPendingAcertou] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [correct, setCorrect] = useState(0);
  const [totalNoDeck, setTotalNoDeck] = useState(0);
  // sessão criada ao abrir o baralho; finalizada ao concluir ou abandonar
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (!open || !baralhoId) return;
    let active = true;
    let createdSession: string | null = null;
    setPhase("loading");
    setCards([]);
    setIndex(0);
    setCorrect(0);
    setPendingAcertou(null);
    setSessionId(null);
    finalizedRef.current = false;
    startDeckStudy(baralhoId)
      .then((deck) => {
        if (deck?.sessionId) createdSession = deck.sessionId;
        if (!active) {
          // modal fechou durante o carregamento: limpa a sessão recém-criada
          if (createdSession) finalizeStudySession(createdSession).catch(() => {});
          return;
        }
        if (!deck) {
          setPhase("error");
          return;
        }
        setTitulo(deck.titulo);
        setSessionId(deck.sessionId);
        setCards(deck.cards);
        setTotalNoDeck(deck.totalNoDeck);
        if (deck.cards.length === 0) {
          // nada para revisar agora (deck vazio ou tudo em dia): sessão vazia é apagada
          finalizedRef.current = true;
          finalizeStudySession(deck.sessionId).catch(() => {});
          setPhase("complete");
        } else {
          setStartedAt(Date.now());
          setPhase("question");
        }
      })
      .catch(() => active && setPhase("error"));
    return () => {
      active = false;
    };
  }, [open, baralhoId]);

  const card = cards[index];

  const handleConfidence = async (level: number) => {
    if (!card || pendingAcertou === null) return;
    setPhase("saving");
    try {
      await submitCardReview({
        flashcardId: card.id,
        respostaUsuario: "",
        acertou: pendingAcertou,
        nivelConfianca: level,
        tempoResposta: Date.now() - startedAt,
      });
      if (pendingAcertou) setCorrect((c) => c + 1);

      const next = index + 1;
      if (next >= cards.length) {
        // acabou: o estudo do deck só termina quando todos os flashcards foram respondidos
        if (sessionId) {
          finalizedRef.current = true;
          await finalizeStudySession(sessionId).catch(() => {});
        }
        setPhase("complete");
      } else {
        setIndex(next);
        setPendingAcertou(null);
        setStartedAt(Date.now());
        setPhase("question");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a revisão");
      setPhase("confidence");
    }
  };

  // impede fechar no meio (a não ser nas telas finais)
  const canClose = phase === "complete" || phase === "error" || phase === "loading";
  const handleOpenChange = (o: boolean) => {
    if (!o && !canClose) {
      toast.info("Termine os flashcards do baralho para finalizar.");
      return;
    }
    if (!o && sessionId && !finalizedRef.current) {
      finalizedRef.current = true;
      finalizeStudySession(sessionId).catch(() => {});
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="truncate">Estudar: {titulo || "baralho"}</span>
            {cards.length > 0 && phase !== "complete" && phase !== "error" && (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {Math.min(index + 1, cards.length)} / {cards.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {phase === "question"
              ? "Pense na resposta e revele quando estiver pronto."
              : phase === "answer"
              ? "Você acertou?"
              : phase === "confidence"
              ? "Quão confiante você estava?"
              : phase === "complete"
              ? "Baralho concluído."
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {phase === "loading" || phase === "saving" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              {phase === "saving" ? "Salvando..." : "Carregando..."}
            </div>
          ) : phase === "error" ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Não foi possível carregar este baralho.
            </p>
          ) : phase === "complete" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <CheckCircle2Icon className="size-10 text-green-600 dark:text-green-500" />
              <p className="text-sm font-medium">
                {cards.length === 0 ? "Nada para revisar agora" : "Baralho concluído!"}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {cards.length === 0
                  ? totalNoDeck === 0
                    ? "Este baralho não tem flashcards."
                    : "Todos os flashcards deste baralho estão em dia. Volte quando algum vencer."
                  : `${correct} de ${cards.length} corretas.`}
              </p>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : card ? (
            <div className="space-y-4">
              <FlashcardFace
                pergunta={card.pergunta}
                resposta={card.resposta}
                conceito={card.conceito}
                showAnswer={phase === "answer" || phase === "confidence"}
              />

              {phase === "question" && (
                <div className="flex justify-center">
                  <Button size="lg" className="w-full gap-2" onClick={() => setPhase("answer")}>
                    <EyeIcon className="size-4" />
                    Ver resposta
                  </Button>
                </div>
              )}

              {phase === "answer" && (
                <div className="flex justify-center gap-3">
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setPendingAcertou(false);
                      setPhase("confidence");
                    }}
                  >
                    <XCircleIcon className="size-4" />
                    Errei
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700"
                    onClick={() => {
                      setPendingAcertou(true);
                      setPhase("confidence");
                    }}
                  >
                    <CheckCircle2Icon className="size-4" />
                    Acertei
                  </Button>
                </div>
              )}

              {phase === "confidence" && (
                <div>
                  <label className="mb-2 block text-center text-xs font-medium text-muted-foreground">
                    Quão confiante você estava nessa resposta?
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleConfidence(level)}
                        className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card py-2.5 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <span className="text-base font-semibold">{level}</span>
                        <span className="mt-0.5 hidden text-[0.65rem] leading-tight sm:inline">
                          {CONFIDENCE_LABELS[level - 1]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
