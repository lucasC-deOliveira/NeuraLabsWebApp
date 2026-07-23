"use client";

import { LoadingState, ErrorState } from "@/components/loading-state";
import { useQuestaoItemAnalytics } from "@/modules/analytics/presentation/useItemAnalytics";
import { QuestaoItemView } from "@/modules/analytics/presentation/components/QuestaoItemView";
import { AnalyticsModalShell } from "./AnalyticsModalShell";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questaoId: string | null;
}

export function QuestaoItemAnalyticsModal({ open, onOpenChange, questaoId }: Props) {
  const { data, loading, error } = useQuestaoItemAnalytics(open ? questaoId : null);
  return (
    <AnalyticsModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Analytics da questão"
      description={data?.enunciado}
    >
      {loading ? (
        <LoadingState message="Carregando analytics da questão…" hint="Reunindo as respostas nas tentativas." />
      ) : error || !data ? (
        <ErrorState message={error ?? "Não foi possível carregar os analytics."} />
      ) : (
        <QuestaoItemView data={data} />
      )}
    </AnalyticsModalShell>
  );
}
