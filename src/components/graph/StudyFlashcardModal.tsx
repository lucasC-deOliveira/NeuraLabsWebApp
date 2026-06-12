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
import { Loader2Icon, EyeIcon, CheckCircle2Icon, XCircleIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { startSingleCardStudy, submitCardReview, finalizeStudySession } from "@/actions/study";
import { MarkdownContent } from "@/components/markdown-content";

interface StudyFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
}

type Card = { id: string; pergunta: string; resposta: string; conceito: string | null };
type Phase = "loading" | "question" | "answer" | "confidence" | "saving" | "done" | "notdue" | "error";

const CONFIDENCE_LABELS = ["Nada", "Pouco", "Neutro", "Confiante", "Muito"];

function formatProxima(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const dias = Math.ceil(diffMs / 86400000);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (dias <= 1) return `amanhã (${data})`;
  return `em ${dias} dias (${data})`;
}

export function StudyFlashcardModal({ open, onOpenChange, flashcardId }: StudyFlashcardModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [card, setCard] = useState<Card | null>(null);
  const [proximaRevisao, setProximaRevisao] = useState<string | null>(null);
  const [pendingAcertou, setPendingAcertou] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  // sessão de estudo criada ao abrir; finalizada ao terminar ou abandonar
  const [sessionId, setSessionId] = useState<string | null>(null);
  const finalizedRef = useRef(false);

  // abre a sessão de estudo ao clicar em "Estudar" (carrega o card)
  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    let createdSession: string | null = null;
    setPhase("loading");
    setCard(null);
    setPendingAcertou(null);
    setSessionId(null);
    finalizedRef.current = false;
    startSingleCardStudy(flashcardId)
      .then((res) => {
        if (res?.sessionId) createdSession = res.sessionId;
        if (!active) {
          // modal fechou durante o carregamento: limpa a sessão recém-criada
          if (createdSession) finalizeStudySession(createdSession).catch(() => {});
          return;
        }
        if (!res) {
          setPhase("error");
          return;
        }
        setCard(res.card);
        setProximaRevisao(res.proximaRevisao);
        setStartedAt(Date.now());
        // repetição espaçada: só pode estudar se estiver vencido
        if (res.due && res.sessionId) {
          setSessionId(res.sessionId);
          setPhase("question");
        } else {
          setPhase("notdue");
        }
      })
      .catch(() => active && setPhase("error"));
    return () => {
      active = false;
    };
  }, [open, flashcardId]);

  const handleConfidence = async (level: number) => {
    if (!card || pendingAcertou === null || !sessionId) return;
    setPhase("saving");
    try {
      await submitCardReview({
        flashcardId: card.id,
        respostaUsuario: "",
        acertou: pendingAcertou,
        nivelConfianca: level,
        tempoResposta: Date.now() - startedAt,
        sessaoId: sessionId,
      });
      // termina a sessão (encerra, pois teve revisão)
      finalizedRef.current = true;
      await finalizeStudySession(sessionId).catch(() => {});
      setPhase("done");
      toast.success(pendingAcertou ? "Acerto registrado!" : "Revisão registrada — volte nele em breve.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a revisão");
      setPhase("confidence");
    }
  };

  // ao fechar antes de responder, finaliza a sessão (vazia → é apagada)
  const handleOpenChange = (o: boolean) => {
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
          <DialogTitle>Estudar flashcard</DialogTitle>
          <DialogDescription>
            {phase === "question"
              ? "Pense na resposta e revele quando estiver pronto."
              : phase === "answer"
              ? "Você acertou?"
              : phase === "confidence"
              ? "Quão confiante você estava?"
              : phase === "done"
              ? "Revisão salva."
              : " "}
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
              Não foi possível carregar este flashcard.
            </p>
          ) : phase === "done" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <CheckCircle2Icon className="size-10 text-green-600 dark:text-green-500" />
              <p className="text-sm text-muted-foreground">Revisão registrada com sucesso.</p>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : phase === "notdue" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <ClockIcon className="size-10 text-muted-foreground" />
              <p className="text-sm font-medium">Ainda não é hora de revisar</p>
              <p className="text-xs text-muted-foreground">
                Pela repetição espaçada, este flashcard estará disponível{" "}
                {proximaRevisao ? formatProxima(proximaRevisao) : "em breve"}.
              </p>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : card ? (
            <div className="space-y-4">
              {/* Pergunta */}
              <div className="rounded-xl border bg-card p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pergunta
                </span>
                <div className="mt-1 text-base font-medium">
                  <MarkdownContent>{card.pergunta}</MarkdownContent>
                </div>
              </div>

              {/* Resposta — só após revelar */}
              {(phase === "answer" || phase === "confidence") && (
                <div className="rounded-xl border border-primary/30 bg-muted/40 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Resposta
                  </span>
                  <div className="mt-1 text-sm">
                    <MarkdownContent>{card.resposta}</MarkdownContent>
                  </div>
                  {card.conceito && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Conceito: {card.conceito}
                    </p>
                  )}
                </div>
              )}

              {/* Ações por fase */}
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
