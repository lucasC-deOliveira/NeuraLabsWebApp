"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import type { FlashcardData } from "@/types";
import type { Phase, LastResult } from "../study-phase";
import { StudyCardView } from "./StudyCardView";
import { AnswerActions } from "./AnswerActions";
import { ConfidencePicker } from "./ConfidencePicker";
import { FeedbackBanner } from "./FeedbackBanner";
import { KeyboardHints } from "./KeyboardHints";

export interface ActiveSessionProps {
  card: FlashcardData;
  phase: Phase;
  currentIndex: number;
  totalCards: number;
  progressPercent: number;
  userAnswer: string;
  lastResult: LastResult | null;
  onExit: () => void;
  onReveal: () => void;
  onAnswer: (acertou: boolean) => void;
  onStartElaboration: () => void;
  onUserAnswer: (v: string) => void;
  onCancelElaboration: () => void;
  onConfidence: (level: number) => void;
}

export function ActiveSession(props: ActiveSessionProps) {
  const { card, phase, currentIndex, totalCards, progressPercent, userAnswer, lastResult } = props;
  const revealed = phase === "answer" || phase === "elaboration";
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b px-3 sm:px-5 py-3 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={props.onExit}>
              <ArrowLeftIcon className="mr-1 size-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} / {totalCards}
          </Badge>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-4xl border-b px-3 sm:px-5 py-2 sm:py-3">
        <Progress value={progressPercent} className="h-2">
          <ProgressTrack className="h-1">
            <ProgressIndicator className="bg-primary transition-[width] duration-500" />
          </ProgressTrack>
        </Progress>
      </div>

      {/* Card Area */}
      <main className="flex flex-1 items-center justify-center px-3 sm:px-5 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          <StudyCardView card={card} phase={phase} />

          {phase === "question" && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <Button size="lg" onClick={props.onReveal} className="gap-2 w-full sm:w-auto">
                <EyeIcon className="size-4" />
                Ver Resposta
              </Button>
            </div>
          )}

          {revealed && (
            <AnswerActions
              phase={phase}
              userAnswer={userAnswer}
              onAnswer={props.onAnswer}
              onStartElaboration={props.onStartElaboration}
              onUserAnswer={props.onUserAnswer}
              onCancelElaboration={props.onCancelElaboration}
            />
          )}

          {phase === "confidence" && <ConfidencePicker onPick={props.onConfidence} />}

          {phase === "feedback" && lastResult && <FeedbackBanner result={lastResult} />}

          <KeyboardHints phase={phase} />
        </div>
      </main>
    </div>
  );
}
