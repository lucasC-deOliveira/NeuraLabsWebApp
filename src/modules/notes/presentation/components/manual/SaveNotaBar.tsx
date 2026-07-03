"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";
import type { PendingTopic, PendingConcept } from "../../../domain/manual-nota-draft";

function saveLabel(pendingTopics: PendingTopic[], pendingConcepts: PendingConcept[]): string {
  const parts: string[] = [];
  if (pendingTopics.length > 0) parts.push(`${pendingTopics.length} topico(s)`);
  if (pendingConcepts.length > 0) parts.push(`${pendingConcepts.length} conceito(s)`);
  return parts.length > 0 ? `Criar nota e ${parts.join(", ")}` : "Criar nota";
}

export function SaveNotaBar({ saving, pendingTopics, pendingConcepts, onSave }: {
  saving: boolean;
  pendingTopics: PendingTopic[];
  pendingConcepts: PendingConcept[];
  onSave: () => void;
}) {
  return (
    <Button onClick={onSave} disabled={saving} size="lg" className="w-full">
      {saving ? (
        <><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>
      ) : (
        <><CheckCircle2Icon className="size-4 mr-1" /> {saveLabel(pendingTopics, pendingConcepts)}</>
      )}
    </Button>
  );
}
