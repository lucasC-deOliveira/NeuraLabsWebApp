"use client";

import { LoadingState, ErrorState } from "@/components/loading-state";
import { useProvaAnalytics } from "@/modules/analytics/presentation/useProvaAnalytics";
import { ProvaAnalyticsView } from "@/modules/analytics/presentation/components/ProvaAnalyticsView";
import { AnalyticsModalShell } from "./AnalyticsModalShell";

const WINDOW_DAYS = 3650; // todo o histórico da prova (o filtro aqui é a prova).

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provaId: string | null;
}

export function ProvaAnalyticsModal({ open, onOpenChange, provaId }: Props) {
  return (
    <AnalyticsModalShell open={open} onOpenChange={onOpenChange} title="Analytics da prova">
      {open && provaId ? <ProvaBody provaId={provaId} /> : null}
    </AnalyticsModalShell>
  );
}

function ProvaBody({ provaId }: { provaId: string }) {
  const { data, loading, error, reload } = useProvaAnalytics(WINDOW_DAYS, provaId);
  if (loading) {
    return <LoadingState message="Carregando analytics da prova…" hint="Reunindo tentativas e respostas." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  return <ProvaAnalyticsView data={data} />;
}
