"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import type { LastResult } from "../study-phase";

export function FeedbackBanner({ result }: { result: LastResult }) {
  return (
    <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-center">
      <div
        className={`rounded-xl border px-4 py-3 sm:px-6 sm:py-4 ${
          result.acertou
            ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/30"
            : "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {result.acertou ? (
            <CheckCircle2Icon className="size-4 sm:size-5 text-green-600" />
          ) : (
            <XCircleIcon className="size-4 sm:size-5 text-red-500" />
          )}
          <span className="text-base sm:text-lg font-semibold">
            {result.acertou ? "Correto!" : "Incorreto"}
          </span>
        </div>
        {result.metacognitiveGap && (
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-500">
            Voce estava confiante, mas errou -- revise este conceito com atencao!
          </p>
        )}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Avancando automaticamente...</p>
    </div>
  );
}
