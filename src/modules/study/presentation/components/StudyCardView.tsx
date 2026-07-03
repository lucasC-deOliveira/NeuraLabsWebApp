"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/markdown-content";
import type { FlashcardData } from "@/types";
import type { Phase } from "../study-phase";

export function StudyCardView({ card, phase }: { card: FlashcardData; phase: Phase }) {
  return (
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
  );
}
