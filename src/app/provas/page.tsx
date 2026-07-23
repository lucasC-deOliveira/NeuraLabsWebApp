"use client";

// Página fina — a UI vive no módulo hexagonal provas (presentation). O modal de
// analytics é composto AQUI (camada de app), pois o módulo provas só pode cruzar
// contexto para `questions` (regra arch `provas-so-consome-questions`).
import { useState } from "react";
import { ProvasListPage } from "@/modules/provas/presentation/ProvasListPage";
import { ProvaAnalyticsModal } from "@/modules/analytics/presentation/components/modals/ProvaAnalyticsModal";

export default function ProvasPage() {
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  return (
    <>
      <ProvasListPage onOpenAnalytics={setAnalyticsId} />
      <ProvaAnalyticsModal
        open={analyticsId !== null}
        onOpenChange={(open) => !open && setAnalyticsId(null)}
        provaId={analyticsId}
      />
    </>
  );
}
