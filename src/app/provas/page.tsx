"use client";

// Página fina — a UI vive no módulo hexagonal provas (presentation). Os modais de
// analytics e estudo são compostos AQUI (camada de app), pois o módulo provas só
// pode cruzar contexto para `questions` (regra arch `provas-so-consome-questions`).
import { useState } from "react";
import { ProvasListPage } from "@/modules/provas/presentation/ProvasListPage";
import { ProvaAnalyticsModal } from "@/modules/analytics/presentation/components/modals/ProvaAnalyticsModal";
import { StudyProvaModal } from "@/modules/graph/presentation/components/deck/StudyProvaModal";

export default function ProvasPage() {
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  return (
    <>
      <ProvasListPage onOpenAnalytics={setAnalyticsId} onOpenStudy={setStudyId} />
      <ProvaAnalyticsModal
        open={analyticsId !== null}
        onOpenChange={(open) => !open && setAnalyticsId(null)}
        provaId={analyticsId}
      />
      <StudyProvaModal
        open={studyId !== null}
        onOpenChange={(open) => !open && setStudyId(null)}
        provaId={studyId}
        questaoId={null}
      />
    </>
  );
}
