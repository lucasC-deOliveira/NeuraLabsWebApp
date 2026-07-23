"use client";

import { LoadingState, ErrorState } from "@/components/loading-state";
import { useFlashcardAnalytics } from "@/modules/analytics/presentation/useFlashcardAnalytics";
import { FlashcardAnalyticsView } from "@/modules/analytics/presentation/components/FlashcardAnalyticsView";
import { AnalyticsModalShell } from "./AnalyticsModalShell";

// ~10 anos: efetivamente todo o histórico do baralho (o filtro aqui é o baralho).
const WINDOW_DAYS = 3650;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
}

export function DeckAnalyticsModal({ open, onOpenChange, baralhoId }: Props) {
  return (
    <AnalyticsModalShell open={open} onOpenChange={onOpenChange} title="Analytics do baralho">
      {open && baralhoId ? <DeckBody baralhoId={baralhoId} /> : null}
    </AnalyticsModalShell>
  );
}

function DeckBody({ baralhoId }: { baralhoId: string }) {
  const { data, loading, error, reload } = useFlashcardAnalytics(WINDOW_DAYS, baralhoId);
  if (loading) {
    return <LoadingState message="Carregando analytics do baralho…" hint="Reunindo revisões e estado das cartas." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  return <FlashcardAnalyticsView data={data} />;
}
