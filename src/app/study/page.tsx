"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  startStudySession,
  submitCardReview,
  endStudySession,
} from "@/actions/study";
import type { FlashcardData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/markdown-content";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  Loader2Icon,
} from "lucide-react";

type Phase = "loading" | "question" | "answer" | "elaboration" | "feedback" | "complete";

interface SessionStats {
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  startTime: Date;
  endTime?: Date;
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Nada confiante",
  2: "Pouco confiante",
  3: "Neutro",
  4: "Confiante",
  5: "Muito confiante",
};

export default function StudyPage() {
  const router = useRouter();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardData[]>([]);

  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");

  // User input state
  const [confidence, setConfidence] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState("");

  // Timing state
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [cardStartTime, setCardStartTime] = useState<Date>(new Date());

  // Stats
  const [stats, setStats] = useState<SessionStats | null>(null);

  // Feedback
  const [lastResult, setLastResult] = useState<{
    acertou: boolean;
    confidence: number;
    metacognitiveGap: boolean;
  } | null>(null);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session init
  useEffect(() => {
    async function init() {
      try {
        const result = await startStudySession();
        setSessionId(result.sessionId);
        setCards(result.cards);
        setStats({
          totalCards: result.cards.length,
          correctCount: 0,
          incorrectCount: 0,
          startTime: new Date(),
        });
        setStartTime(new Date());
        setCardStartTime(new Date());
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

  // Keyboard shortcuts — use refs for stable access to latest state
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const confidenceRef = useRef(confidence);
  confidenceRef.current = confidence;
  const userAnswerRef = useRef(userAnswer);
  userAnswerRef.current = userAnswer;
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const cardStartTimeRef = useRef(cardStartTime);
  cardStartTimeRef.current = cardStartTime;
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const handleRevealAnswerRef = useRef(() => {
    setPhase("answer");
    setCardStartTime(new Date());
  });

  const triggerAnswer = useRef(async (acertou: boolean) => {
    const cfConfidence = confidenceRef.current;
    const card = cards[currentIndexRef.current];
    if (!card) return;
    const elapsedMs = Date.now() - cardStartTimeRef.current.getTime();
    const metacognitiveGap = !acertou && cfConfidence >= 4;
    try {
      await submitCardReview({
        flashcardId: card.id,
        respostaUsuario: "",
        acertou,
        nivelConfianca: cfConfidence,
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
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null;
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= cards.length) {
        if (sessionIdRef.current) {
          endStudySession(sessionIdRef.current).catch(() => {});
        }
        setStats((p) => (p ? { ...p, endTime: new Date() } : null));
        setPhase("complete");
      } else {
        setCurrentIndex(nextIndex);
        setConfidence(0);
        setUserAnswer("");
        setCardStartTime(new Date());
        setPhase("question");
        setLastResult(null);
      }
    }, 1500);
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (phaseRef.current === "question" && confidenceRef.current > 0) {
          handleRevealAnswerRef.current();
        } else if (phaseRef.current === "elaboration" && userAnswerRef.current.trim()) {
          triggerAnswer.current(true);
        }
      }
      if (phaseRef.current === "answer") {
        if (e.key === "1") {
          e.preventDefault();
          triggerAnswer.current(false);
        }
        if (e.key === "2") {
          e.preventDefault();
          triggerAnswer.current(true);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards]);

  // Handlers used only by JSX (keyboard logic uses refs above)
  const handleRevealAnswer = () => {
    setPhase("answer");
    setCardStartTime(new Date());
  };

  const handleAnswer = async (acertou: boolean) => {
    triggerAnswer.current(acertou);
  };

  const handleElaborationSubmit = async (acertou: boolean) => {
    triggerAnswer.current(acertou);
  };

  const completeSession = async () => {
    if (sessionId) {
      try {
        await endStudySession(sessionId);
      } catch (error) {
        console.error(error);
      }
    }
    setStats((prev) =>
      prev ? { ...prev, endTime: new Date() } : null,
    );
    setPhase("complete");
  };

  // Format helpers
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = stats
    ? Math.round(((currentIndex) / stats.totalCards) * 100)
    : 0;

  // Loading
  if (phase === "loading") {
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

  // Complete
  if (phase === "complete" && stats) {
    const elapsedTime = stats.endTime
      ? stats.endTime.getTime() - stats.startTime.getTime()
      : Date.now() - stats.startTime.getTime();
    const accuracy =
      stats.totalCards > 0
        ? Math.round((stats.correctCount / stats.totalCards) * 100)
        : 0;

    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="border-b px-3 sm:px-5 py-3 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <ArrowLeftIcon className="mr-1 size-4" />
              Voltar
            </Button>
            <h1 className="text-base sm:text-lg font-semibold">Sessao Concluida</h1>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-3 sm:px-5 py-8 sm:py-12">
          <Card className="mx-auto max-w-md w-full border-green-200 bg-green-50/30 dark:border-green-800/50 dark:bg-green-950/20">
            <CardHeader className="items-center space-y-2 px-4 sm:px-6">
              <CheckCircle2Icon className="size-8 sm:size-12 text-green-600 dark:text-green-500" />
              <CardTitle className="text-center text-xl sm:text-2xl">
                Parabens!
              </CardTitle>
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                Voce concluiu a sessao de estudo
              </p>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Cartoes</p>
                  <p className="text-2xl sm:text-3xl font-semibold">{stats.totalCards}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Precisao</p>
                  <p className="text-2xl sm:text-3xl font-semibold">{accuracy}%</p>
                </div>
                <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Acertos</p>
                  <p className="text-xl sm:text-2xl font-semibold text-green-600">
                    {stats.correctCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Erros</p>
                  <p className="text-xl sm:text-2xl font-semibold text-red-500">
                    {stats.incorrectCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <ClockIcon className="size-3.5 sm:size-4" />
                <span>Tempo total: {formatTime(elapsedTime)}</span>
              </div>

              {accuracy >= 80 ? (
                <Badge variant="default" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
                  <CheckCircle2Icon className="size-3" />
                  Excelente desempenho
                </Badge>
              ) : accuracy >= 50 ? (
                <Badge variant="secondary" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
                  Bom progresso, continue praticando
                </Badge>
              ) : (
                <Badge variant="destructive" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
                  <XCircleIcon className="size-3" />
                  Revise os conceitos novamente
                </Badge>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Active session
  if (!stats || cards.length === 0 || !cards[currentIndex]) {
    return null;
  }

  const card = cards[currentIndex];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b px-3 sm:px-5 py-3 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeftIcon className="mr-1 size-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} / {stats.totalCards}
          </Badge>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-4xl border-b px-3 sm:px-5 py-2 sm:py-3">
        <Progress value={progressPercent} className="h-2">
          <ProgressTrack className="h-1">
            <ProgressIndicator
              className="bg-primary transition-[width] duration-500"
            />
          </ProgressTrack>
        </Progress>
      </div>

      {/* Card Area */}
      <main className="flex flex-1 items-center justify-center px-3 sm:px-5 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          {/* Confidence Selector - only in question phase */}
          {phase === "question" && (
            <div className="mb-3 sm:mb-4">
              <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-muted-foreground">
                Quao confiante voce e antes de ver a resposta?
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidence(level)}
                    className={`
                      flex flex-1 flex-col items-center justify-center rounded-lg border py-2 sm:py-2.5 text-xs sm:text-sm transition-all
                      ${
                        confidence === level
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }
                    `}
                  >
                    <span className="text-sm sm:text-base font-semibold">{level}</span>
                    <span className="mt-0.5 text-[0.6rem] sm:text-[0.65rem] leading-tight text-center hidden sm:inline">
                      {CONFIDENCE_LABELS[level].split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Card */}
          <Card className="text-center">
            <CardHeader className="px-4 sm:px-6 pb-2">
              <CardTitle className="text-sm sm:text-lg font-medium text-muted-foreground uppercase tracking-wider">
                {phase === "question" ? "Pergunta" : "Resposta"}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-4 sm:px-6">
              {phase === "question" ? (
                <div className="text-lg sm:text-2xl font-medium leading-relaxed">
                  <MarkdownContent>{card.pergunta}</MarkdownContent>
                </div>
              ) : (
                <div>
                  <div className="mb-4 sm:mb-6 text-lg sm:text-2xl font-medium leading-relaxed">
                    <MarkdownContent>{card.pergunta}</MarkdownContent>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="text-sm sm:text-lg leading-relaxed text-foreground">
                      <MarkdownContent>{card.resposta}</MarkdownContent>
                    </div>
                    {card.conceito && (
                      <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
                        Conceito: {card.conceito}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer Actions */}
          {phase === "question" && confidence > 0 && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <Button size="lg" onClick={handleRevealAnswer} className="gap-2 w-full sm:w-auto">
                <EyeIcon className="size-4" />
                Ver Resposta
              </Button>
            </div>
          )}

          {/* After revealing */}
          {(phase === "answer" || phase === "elaboration") && (
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              {/* Acertei / Errei buttons */}
              <div className="flex justify-center gap-2 sm:gap-3">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => handleAnswer(false)}
                  className="min-w-[100px] sm:min-w-[120px] gap-2 flex-1 sm:flex-initial"
                >
                  <XCircleIcon className="size-4" />
                  Errei
                </Button>
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => handleAnswer(true)}
                  className="min-w-[100px] sm:min-w-[120px] gap-2 bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-initial"
                >
                  <CheckCircle2Icon className="size-4" />
                  Acertei
                </Button>
              </div>

              {/* Elaboration */}
              {phase !== "elaboration" && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhase("elaboration")}
                    className="gap-2 text-xs"
                  >
                    Responder com minhas palavras
                  </Button>
                </div>
              )}

              {phase === "elaboration" && (
                <div className="mt-2 space-y-3">
                  <Textarea
                    placeholder="Escreva a resposta com suas proprias palavras..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                    autoFocus
                  />
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserAnswer("");
                        setPhase("answer");
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!userAnswer.trim()}
                      onClick={() => handleElaborationSubmit(false)}
                      className="flex-1 sm:flex-none"
                    >
                      Errei
                    </Button>
                    <Button
                      size="sm"
                      disabled={!userAnswer.trim()}
                      onClick={() => handleElaborationSubmit(true)}
                      className="bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-none"
                    >
                      Acertei
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          {phase === "feedback" && lastResult && (
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-center">
              <div
                className={`rounded-xl border px-4 py-3 sm:px-6 sm:py-4 ${
                  lastResult.acertou
                    ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/30"
                    : "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {lastResult.acertou ? (
                    <CheckCircle2Icon className="size-4 sm:size-5 text-green-600" />
                  ) : (
                    <XCircleIcon className="size-4 sm:size-5 text-red-500" />
                  )}
                  <span className="text-base sm:text-lg font-semibold">
                    {lastResult.acertou ? "Correto!" : "Incorreto"}
                  </span>
                </div>
                {lastResult.metacognitiveGap && (
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-500">
                    Voce estava confiante, mas errou -- revise este conceito com
                    atencao!
                  </p>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Avancando automaticamente...
              </p>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          {(phase === "answer" || phase === "question") && (
            <div className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground">
              {phase === "question" && (
                <span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                    Space
                  </kbd>{" "}
                  revelar resposta
                </span>
              )}
              {phase === "answer" && (
                <>
                  <span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                      1
                    </kbd>{" "}
                    Errei
                  </span>
                  <span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                      2
                    </kbd>{" "}
                    Acertei
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
