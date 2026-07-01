import { Loader2Icon, CheckIcon } from "lucide-react";

// Linha de progresso de uma etapa de processamento por IA (done/active/pending),
// compartilhada pelos modais de IA (auto-link, trilha, etc.).

export type AiStepStatus = "done" | "active" | "pending";

function StepIcon({ index, status }: { index: number; status: AiStepStatus }) {
  if (status === "done") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <CheckIcon className="size-3.5" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
        <Loader2Icon className="size-3.5 animate-spin text-primary" />
      </span>
    );
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground font-medium">
      {index}
    </span>
  );
}

function formatElapsed(elapsed: number): string {
  return Math.floor(elapsed / 60) > 0 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
}

interface AiStepRowProps {
  index: number;
  label: string;
  sublabel?: string;
  status: AiStepStatus;
  elapsed?: number;
}

export function AiStepRow({ index, label, sublabel, status, elapsed }: AiStepRowProps) {
  return (
    <div className={`flex items-start gap-3 transition-opacity ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
      <div className="mt-0.5 shrink-0">
        <StepIcon index={index} status={status} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-tight ${status === "active" ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {status === "active" && sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        {status === "active" && elapsed !== undefined && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 tabular-nums">{formatElapsed(elapsed)}</p>
        )}
      </div>
    </div>
  );
}
