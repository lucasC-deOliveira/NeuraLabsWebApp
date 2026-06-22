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
import { Loader2Icon, EyeIcon, CheckCircle2Icon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { startDeckStudy, submitCardReview, finalizeStudySession } from "@/lib/study-api";
import type { FlashcardData } from "@/types";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { readAllVaultNodes, graphVaultDir } from "@/lib/vault-sync";
import {
  readSrsLog,
  startLocalSession,
  submitLocalReview,
  finalizeLocalSession,
  isDue,
  needsRequeue,
  type ReviewGrade,
  type LocalSchedule,
} from "@/lib/srs-local";

interface StudyDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
  grafoId?: string;
  grafoNome?: string;
  // Modo ego network: estuda estes flashcard IDs em vez de um baralho
  customFlashcardIds?: string[];
  customTitulo?: string;
}

interface QueueCard extends FlashcardData {
  schedule: LocalSchedule | null;
}

type Phase = "loading" | "question" | "answer" | "saving" | "complete" | "error";

const GRADE_BUTTONS: Array<{ grade: ReviewGrade; label: string; sublabel: string; className: string }> = [
  { grade: "again", label: "Errei",    sublabel: "< 1 min",  className: "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400" },
  { grade: "hard",  label: "Difícil",  sublabel: "~ 10 min", className: "border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400" },
  { grade: "good",  label: "Bom",      sublabel: "em breve", className: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: "easy",  label: "Fácil",    sublabel: "mais dias",className: "border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400" },
];

export function StudyDeckModal({ open, onOpenChange, baralhoId, grafoId, grafoNome, customFlashcardIds, customTitulo }: StudyDeckModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [titulo, setTitulo] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphDir, setGraphDir] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [totalNoDeck, setTotalNoDeck] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (!open || (!baralhoId && !customFlashcardIds)) return;
    let active = true;

    setPhase("loading");
    setQueue([]);
    setIndex(0);
    setReviewed(0);
    setSessionId(null);
    setGraphDir(null);
    finalizedRef.current = false;

    async function load() {
      // Modo ego network: flashcards customizados (apenas desktop)
      if (customFlashcardIds && customFlashcardIds.length > 0) {
        if (!isDesktop() || !grafoId || !grafoNome) {
          if (active) setPhase("error");
          return;
        }
        const vaultDir = await desktop.vault.getPath().catch(() => null);
        if (!vaultDir) { if (active) setPhase("error"); return; }
        const dir = graphVaultDir(vaultDir, grafoId, grafoNome);

        const [vaultNodes, srsLog] = await Promise.all([
          readAllVaultNodes(grafoId, grafoNome),
          readSrsLog(dir),
        ]);
        const nodeById = new Map(vaultNodes.map((n) => [n.id, n]));
        const dueCards: QueueCard[] = customFlashcardIds
          .map((id) => nodeById.get(id))
          .filter((n) => n && n.tipo === "FLASHCARD" && isDue(srsLog.schedule[n.id]))
          .map((n) => ({
            id: n!.id,
            pergunta: n!.pergunta ?? "",
            resposta: n!.resposta ?? "",
            conceito: null,
            schedule: srsLog.schedule[n!.id] ?? null,
          }));

        if (!active) return;
        setTitulo(customTitulo ?? "Vizinhança");
        setTotalNoDeck(customFlashcardIds.length);
        setGraphDir(dir);

        if (dueCards.length === 0) { setPhase("complete"); return; }

        const sessId = await startLocalSession(dir, "neighborhood-" + Date.now());
        if (!active) { finalizeLocalSession(dir, sessId).catch(() => {}); return; }
        setSessionId(sessId);
        setQueue(dueCards);
        setStartedAt(Date.now());
        setPhase("question");
        return;
      }

      // Desktop vault path: only used when vault is available AND baralho is synced there.
      // Falls through to API path if vault dir missing or baralho not yet pulled.
      if (isDesktop() && grafoId && grafoNome) {
        const vaultDir = await desktop.vault.getPath().catch(() => null);
        if (vaultDir) {
          const dir = graphVaultDir(vaultDir, grafoId, grafoNome);
          const [vaultNodes, srsLog] = await Promise.all([
            readAllVaultNodes(grafoId, grafoNome),
            readSrsLog(dir),
          ]);
          const nodeById = new Map(vaultNodes.map((n) => [n.id, n]));
          const baralho = nodeById.get(baralhoId!);
          if (baralho && baralho.tipo === "BARALHO") {
            const dueCards: QueueCard[] = baralho.relacoes
              .filter((r) => r.rel === "CONTEM")
              .map((r) => nodeById.get(r.alvo))
              .filter((n) => n && n.tipo === "FLASHCARD" && isDue(srsLog.schedule[n.id]))
              .map((n) => ({
                id: n!.id,
                pergunta: n!.pergunta ?? "",
                resposta: n!.resposta ?? "",
                conceito: null,
                schedule: srsLog.schedule[n!.id] ?? null,
              }));

            if (!active) return;
            setTitulo(baralho.titulo ?? baralho.nome ?? "Baralho");
            setTotalNoDeck(baralho.relacoes.filter((r) => r.rel === "CONTEM").length);
            setGraphDir(dir);

            if (dueCards.length === 0) { setPhase("complete"); return; }

            const sessId = await startLocalSession(dir, baralhoId!);
            if (!active) { finalizeLocalSession(dir, sessId).catch(() => {}); return; }
            setSessionId(sessId);
            setQueue(dueCards);
            setStartedAt(Date.now());
            setPhase("question");
            return;
          }
          // Baralho not in vault yet (not pulled) — fall through to API path
        }
      }

      // API path: used on web, or when vault unavailable, or baralho not yet in vault.
      const deck = await startDeckStudy(baralhoId!).catch(() => null);
      if (!active) { if (deck?.sessionId) finalizeStudySession(deck.sessionId).catch(() => {}); return; }
      if (!deck) { setPhase("error"); return; }
      setTitulo(deck.titulo);
      setSessionId(deck.sessionId);
      setTotalNoDeck(deck.totalNoDeck);
      if (deck.cards.length === 0) {
        finalizedRef.current = true;
        finalizeStudySession(deck.sessionId).catch(() => {});
        setPhase("complete");
      } else {
        setQueue(deck.cards.map((c) => ({ ...c, schedule: null })));
        setStartedAt(Date.now());
        setPhase("question");
      }
    }

    load().catch(() => { if (active) setPhase("error"); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baralhoId]);

  const card = queue[index] ?? null;
  const remaining = queue.length - index;

  const handleGrade = async (grade: ReviewGrade) => {
    if (!card) return;
    setPhase("saving");
    try {
      let newSchedule = card.schedule;

      if (graphDir && sessionId) {
        newSchedule = await submitLocalReview(graphDir, sessionId, {
          flashcardId: card.id,
          grade,
          tempoResposta: Date.now() - startedAt,
        });
      } else if (sessionId) {
        await submitCardReview({ flashcardId: card.id, grade, tempoResposta: Date.now() - startedAt, sessaoId: sessionId });
      }

      setReviewed((r) => r + 1);

      const shouldRequeue = newSchedule && needsRequeue(newSchedule);
      // Atualiza a fila antes de calcular o próximo índice
      const newQueue = shouldRequeue
        ? [...queue, { ...card, schedule: newSchedule! }]
        : queue;

      if (shouldRequeue) setQueue(newQueue);

      const nextIndex = index + 1;
      if (nextIndex >= newQueue.length) {
        // Fila esgotada — finaliza sessão
        finalizedRef.current = true;
        if (graphDir && sessionId) await finalizeLocalSession(graphDir, sessionId).catch(() => {});
        else if (sessionId) await finalizeStudySession(sessionId).catch(() => {});
        setPhase("complete");
      } else {
        setIndex(nextIndex);
        setStartedAt(Date.now());
        setPhase("question");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a revisão");
      setPhase("answer");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && sessionId && !finalizedRef.current) {
      finalizedRef.current = true;
      if (graphDir) finalizeLocalSession(graphDir, sessionId).catch(() => {});
      else if (sessionId) finalizeStudySession(sessionId).catch(() => {});
    }
    onOpenChange(o);
  };

  // Calcula quantos cards únicos restam (sem contar re-queued duplicates)
  const uniqueRemaining = queue.slice(index).filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="truncate">Estudar: {titulo || "baralho"}</span>
            {queue.length > 0 && phase !== "complete" && phase !== "error" && (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {reviewed} revisados · {uniqueRemaining} restantes
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {phase === "question"
              ? "Pense na resposta e revele quando estiver pronto."
              : phase === "answer"
              ? "Como foi?"
              : phase === "complete"
              ? "Sessão concluída."
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
                {queue.length === 0 ? "Nada para revisar agora" : "Sessão concluída!"}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {queue.length === 0
                  ? totalNoDeck === 0
                    ? "Este baralho não tem flashcards."
                    : "Todos os flashcards estão em dia. Volte quando algum vencer."
                  : `${reviewed} revisões registradas.`}
              </p>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : card ? (
            <div className="space-y-4">
              {/* Indicador de fase do card */}
              {card.schedule && (
                <div className="flex justify-center">
                  <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    card.schedule.fase === 'LEARN'   ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    card.schedule.fase === 'RELEARN' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                    'bg-green-500/10 text-green-600 dark:text-green-400'
                  }`}>
                    {card.schedule.fase === 'LEARN' ? 'aprendendo' : card.schedule.fase === 'RELEARN' ? 'reaprendendo' : `revisão · ${card.schedule.intervalo}d`}
                  </span>
                </div>
              )}

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
