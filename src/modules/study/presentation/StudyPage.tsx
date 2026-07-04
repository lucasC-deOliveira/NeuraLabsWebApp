"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "@/lib/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import type { FlashcardData } from "@/types";
import { studySessionHttp } from "../infra/http";
import { computeGrade, isMetacognitiveGap } from "../domain/study-grade";
import type { SessionStats } from "../domain/study-stats";
import { nowMs, nowDate } from "@/lib/clock";
import type { Phase, LastResult } from "./study-phase";
import { StudyCompleteScreen } from "./components/StudyCompleteScreen";
import { ActiveSession } from "./components/ActiveSession";

function StudyLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b px-3 sm:px-5 py-3 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Loader2Icon className="size-4 sm:size-5 animate-spin text-muted-foreground" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Preparando sua sessao de estudo...
          </span>
        </div>
      </header>
    </div>
  );
}

export function StudyPage() {
  const router = useRouter();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardData[]>([]);

  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");

  // User input state
  const [userAnswer, setUserAnswer] = useState("");
  // resultado pendente: o usuário marca acertou/errou e SÓ DEPOIS informa a confiança
  const [pendingAcertou, setPendingAcertou] = useState<boolean | null>(null);

  // Timing state
  const [cardStartTime, setCardStartTime] = useState<Date>(nowDate);

  // Stats
  const [stats, setStats] = useState<SessionStats | null>(null);

  // Feedback
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session init
  useEffect(() => {
    async function init() {
      try {
        const result = await studySessionHttp.start();
        setSessionId(result.sessionId);
        setCards(result.cards);
        setStats({
          totalCards: result.cards.length,
          correctCount: 0,
          incorrectCount: 0,
          startTime: nowDate(),
        });
        setCardStartTime(nowDate());
        setPhase("question");
      } catch (error) {
        toast.error("Erro ao iniciar sessao de estudo");
        console.error(error);
      }
    }
    init();
  }, []);

  // Cleanup auto-advance
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Keyboard shortcuts read latest state via refs; sync them after commit
  // (react-hooks/refs forbids mutating refs during render).
  const phaseRef = useRef(phase);
  const cardsRef = useRef(cards);
  const cardStartTimeRef = useRef(cardStartTime);
  const currentIndexRef = useRef(currentIndex);
  const sessionIdRef = useRef<string | null>(sessionId);
  const pendingAcertouRef = useRef(pendingAcertou);
  useEffect(() => {
    phaseRef.current = phase;
    cardsRef.current = cards;
    cardStartTimeRef.current = cardStartTime;
    currentIndexRef.current = currentIndex;
    sessionIdRef.current = sessionId;
    pendingAcertouRef.current = pendingAcertou;
  });

  const advanceOrComplete = (): void => {
    autoAdvanceRef.current = null;
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= cardsRef.current.length) {
      if (sessionIdRef.current) studySessionHttp.end(sessionIdRef.current).catch(() => {});
      setStats((p) => (p ? { ...p, endTime: nowDate() } : null));
      setPhase("complete");
      return;
    }
    setCurrentIndex(nextIndex);
    setPendingAcertou(null);
    setUserAnswer("");
    setCardStartTime(nowDate());
    setPhase("question");
    setLastResult(null);
  };

  const triggerAnswer = useRef(async (acertou: boolean, cfConfidence: number) => {
    const card = cardsRef.current[currentIndexRef.current];
    if (!card) return;
    const elapsedMs = nowMs() - cardStartTimeRef.current.getTime();
    const metacognitiveGap = isMetacognitiveGap(acertou, cfConfidence);
    try {
      await studySessionHttp.submitReview({
        flashcardId: card.id,
        grade: computeGrade(acertou, cfConfidence),
        tempoResposta: elapsedMs,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar resposta");
    }
    setStats((prev) =>
      prev
        ? {
            ...prev,
            correctCount: acertou ? prev.correctCount + 1 : prev.correctCount,
            incorrectCount: acertou ? prev.incorrectCount : prev.incorrectCount + 1,
          }
        : null,
    );
    setLastResult({ acertou, confidence: cfConfidence, metacognitiveGap });
    setPhase("feedback");
    autoAdvanceRef.current = setTimeout(advanceOrComplete, 1500);
  });

  // Handlers used by JSX and by the keyboard listener below.
  const handleReveal = (): void => { setPhase("answer"); setCardStartTime(nowDate()); };

  // marca o resultado e pede a confiança em seguida
  const handleAnswer = (acertou: boolean): void => {
    setPendingAcertou(acertou);
    setPhase("confidence");
  };

  const handleConfidence = (level: number): void => {
    if (pendingAcertou === null) return;
    triggerAnswer.current(pendingAcertou, level);
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return;
      // Espaço revela a resposta (sem exigir confiança antes)
      if (e.code === "Space" && phaseRef.current === "question") {
        e.preventDefault();
        setPhase("answer");
        setCardStartTime(nowDate());
        return;
      }
      // Após ver a resposta: 1 = Errei, 2 = Acertei → vai para a confiança
      if (phaseRef.current === "answer" || phaseRef.current === "elaboration") {
        if (e.key === "1") { e.preventDefault(); handleAnswer(false); }
        if (e.key === "2") { e.preventDefault(); handleAnswer(true); }
      }
      // Etapa de confiança: 1–5 envia a revisão
      if (phaseRef.current === "confidence" && ["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        const acertou = pendingAcertouRef.current;
        if (acertou !== null) triggerAnswer.current(acertou, Number(e.key));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards]);

  const progressPercent = stats ? Math.round((currentIndex / stats.totalCards) * 100) : 0;

  if (phase === "loading") return <StudyLoadingScreen />;

  if (phase === "complete" && stats) {
    return <StudyCompleteScreen stats={stats} onExit={() => router.push("/")} />;
  }

  const card = cards[currentIndex];
  if (!stats || cards.length === 0 || !card) return null;

  return (
    <ActiveSession
      card={card}
      phase={phase}
      currentIndex={currentIndex}
      totalCards={stats.totalCards}
      progressPercent={progressPercent}
      userAnswer={userAnswer}
      lastResult={lastResult}
      onExit={() => router.push("/")}
      onReveal={handleReveal}
      onAnswer={handleAnswer}
      onStartElaboration={() => setPhase("elaboration")}
      onUserAnswer={setUserAnswer}
      onCancelElaboration={() => { setUserAnswer(""); setPhase("answer"); }}
      onConfidence={handleConfidence}
    />
  );
}
