"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import type { Phase } from "../study-phase";

interface AnswerActionsProps {
  phase: Phase;
  userAnswer: string;
  onAnswer: (acertou: boolean) => void;
  onStartElaboration: () => void;
  onUserAnswer: (v: string) => void;
  onCancelElaboration: () => void;
}

function ElaborationEditor({ userAnswer, onAnswer, onUserAnswer, onCancel }: {
  userAnswer: string;
  onAnswer: (acertou: boolean) => void;
  onUserAnswer: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 space-y-3">
      <Textarea
        placeholder="Escreva a resposta com suas proprias palavras..."
        value={userAnswer}
        onChange={(e) => onUserAnswer(e.target.value)}
        className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
        autoFocus
      />
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button size="sm" variant="destructive" disabled={!userAnswer.trim()} onClick={() => onAnswer(false)} className="flex-1 sm:flex-none">
          Errei
        </Button>
        <Button size="sm" disabled={!userAnswer.trim()} onClick={() => onAnswer(true)} className="bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-none">
          Acertei
        </Button>
      </div>
    </div>
  );
}

export function AnswerActions({
  phase, userAnswer, onAnswer, onStartElaboration, onUserAnswer, onCancelElaboration,
}: AnswerActionsProps) {
  return (
    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
      {/* Acertei / Errei buttons */}
      <div className="flex justify-center gap-2 sm:gap-3">
        <Button
          size="lg"
          variant="destructive"
          onClick={() => onAnswer(false)}
          className="min-w-[100px] sm:min-w-[120px] gap-2 flex-1 sm:flex-initial"
        >
          <XCircleIcon className="size-4" />
          Errei
        </Button>
        <Button
          size="lg"
          variant="default"
          onClick={() => onAnswer(true)}
          className="min-w-[100px] sm:min-w-[120px] gap-2 bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-initial"
        >
          <CheckCircle2Icon className="size-4" />
          Acertei
        </Button>
      </div>

      {/* Elaboration */}
      {phase !== "elaboration" && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onStartElaboration} className="gap-2 text-xs">
            Responder com minhas palavras
          </Button>
        </div>
      )}

      {phase === "elaboration" && (
        <ElaborationEditor
          userAnswer={userAnswer}
          onAnswer={onAnswer}
          onUserAnswer={onUserAnswer}
          onCancel={onCancelElaboration}
        />
      )}
    </div>
  );
}
