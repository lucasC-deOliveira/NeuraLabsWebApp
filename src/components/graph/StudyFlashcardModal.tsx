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
import { Loader2Icon, EyeIcon, CheckCircle2Icon, ClockIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { startSingleCardStudy, submitCardReview, finalizeStudySession } from "@/lib/study-api";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { findVaultNode, graphVaultDir } from "@/lib/vault-sync";
import {
  readSrsLog,
  startLocalSession,
  submitLocalReview,
  finalizeLocalSession,
  isDue,
  type ReviewGrade,
} from "@/lib/srs-local";

interface StudyFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

type Card = { id: string; pergunta: string; resposta: string; conceito: string | null };
type Phase = "loading" | "question" | "answer" | "saving" | "done" | "notdue" | "error";

const GRADE_BUTTONS: Array<{ grade: ReviewGrade; label: string; sublabel: string; className: string }> = [
  { grade: "again", label: "Errei",   sublabel: "< 1 min",  className: "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400" },
  { grade: "hard",  label: "Difícil", sublabel: "~ 10 min", className: "border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400" },
  { grade: "good",  label: "Bom",     sublabel: "em breve", className: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: "easy",  label: "Fácil",   sublabel: "mais dias",className: "border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400" },
];

function formatProxima(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "agora";
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours < 24) return `em ${hours}h`;
  const dias = Math.ceil(diffMs / 86_400_000);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (dias === 1) return `amanhã (${data})`;
  return `em ${dias} dias (${data})`;
}

export function StudyFlashcardModal({ open, onOpenChange, flashcardId, grafoId, grafoNome }: StudyFlashcardModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [card, setCard] = useState<Card | null>(null);
  const [proximaRevisao, setProximaRevisao] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphDir, setGraphDir] = useState<string | null>(null);
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    setPhase("loading");
    setCard(null);
    setSessionId(null);
    setGraphDir(null);
    finalizedRef.current = false;

    async function load() {
      if (isDesktop() && grafoId && grafoNome) {
        const vaultDir = await desktop.vault.getPath().catch(() => null);
        if (!vaultDir) { if (active) setPhase("error"); return; }
        const dir = graphVaultDir(vaultDir, grafoId, grafoNome);

        const [vn, srsLog] = await Promise.all([
          findVaultNode(grafoId, grafoNome, flashcardId!, "FLASHCARD"),
          readSrsLog(dir),
        ]);

        if (!active) return;
        if (!vn) { setPhase("error"); return; }

        const schedule = srsLog.schedule[flashcardId!];
        const due = isDue(schedule);
        setCard({ id: vn.id, pergunta: vn.pergunta ?? "", resposta: vn.resposta ?? "", conceito: null });
        setGraphDir(dir);

        if (!due) {
          setProximaRevisao(schedule!.proximaRevisao);
          setPhase("notdue");
          return;
        }

        const sessId = await startLocalSession(dir, null);
        if (!active) { finalizeLocalSession(dir, sessId).catch(() => {}); return; }
        setSessionId(sessId);
        setStartedAt(Date.now());
        setPhase("question");
      } else {
        const res = await startSingleCardStudy(flashcardId!).catch(() => null);
        if (!active) { if (res?.sessionId) finalizeStudySession(res.sessionId).catch(() => {}); return; }
        if (!res) { setPhase("error"); return; }
        setCard(res.card);
        setProximaRevisao(res.proximaRevisao);
        setStartedAt(Date.now());
        if (res.due && res.sessionId) {
          setSessionId(res.sessionId);
          setPhase("question");
        } else {
          setPhase("notdue");
        }
      }
    }

    load().catch(() => { if (active) setPhase("error"); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flashcardId]);

  const handleGrade = async (grade: ReviewGrade) => {
    if (!card) return;
    setPhase("saving");
    try {
      if (graphDir && sessionId) {
        await submitLocalReview(graphDir, sessionId, { flashcardId: card.id, grade, tempoResposta: Date.now() - startedAt });
        finalizedRef.current = true;
        await finalizeLocalSession(graphDir, sessionId).catch(() => {});
      } else if (sessionId) {
        await submitCardReview({ flashcardId: card.id, grade, tempoResposta: Date.now() - startedAt, sessaoId: sessionId });
        finalizedRef.current = true;
        await finalizeStudySession(sessionId).catch(() => {});
      }
      setPhase("done");
      toast.success("Revisão registrada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a revisão");
      setPhase("answer");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && sessionId && !finalizedRef.current) {
      finalizedRef.current = true;
      if (graphDir) finalizeLocalSession(graphDir, sessionId).catch(() => {});
      else finalizeStudySession(sessionId).catch(() => {});
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Estudar flashcard</DialogTitle>
          <DialogDescription>
            {phase === "question" ? "Pense na resposta e revele quando estiver pronto."
              : phase === "answer" ? "Como foi?"
              : phase === "done" ? "Revisão salva."
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
              <FlashcardFace
                pergunta={card.pergunta}
                resposta={card.resposta}
                conceito={card.conceito}
                showAnswer={phase === "answer"}
              />

              {phase === "question" && (
                <Button size="lg" className="w-full gap-2" onClick={() => setPhase("answer")}>
                  <EyeIcon className="size-4" />
                  Ver resposta
                </Button>
              )}

              {phase === "answer" && (
                <div className="grid grid-cols-4 gap-2">
                  {GRADE_BUTTONS.map(({ grade, label, sublabel, className }) => (
                    <button
                      key={grade}
                      onClick={() => handleGrade(grade)}
                      className={`flex flex-col items-center justify-center rounded-lg border bg-card px-2 py-2.5 transition-all ${className}`}
                    >
                      {grade === "again" && <RotateCcwIcon className="size-3.5 mb-1 opacity-70" />}
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="mt-0.5 text-[10px] opacity-60">{sublabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
