"use client";

import { LoadingState, ErrorState } from "@/components/loading-state";
import { useFlashcardItemAnalytics } from "@/modules/analytics/presentation/useItemAnalytics";
import { FlashcardItemView } from "@/modules/analytics/presentation/components/FlashcardItemView";
import { AnalyticsModalShell } from "./AnalyticsModalShell";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
}

export function FlashcardItemAnalyticsModal({ open, onOpenChange, flashcardId }: Props) {
  const { data, loading, error } = useFlashcardItemAnalytics(open ? flashcardId : null);
  return (
    <AnalyticsModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Analytics do flashcard"
      description={data?.pergunta}
    >
      {loading ? (
        <LoadingState message="Carregando analytics do flashcard…" hint="Reunindo o histórico de revisões." />
      ) : error || !data ? (
        <ErrorState message={error ?? "Não foi possível carregar os analytics."} />
      ) : (
        <FlashcardItemView data={data} />
      )}
    </AnalyticsModalShell>
  );
}
