"use client";

import { AlertTriangleIcon, CheckIcon, LightbulbIcon, PencilLineIcon } from "lucide-react";
import type { FeynmanFeedback } from "./feynman.types";

function clarezaColor(v: number): string {
  if (v >= 70) return "bg-emerald-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-destructive";
}

function ClarezaBar({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Clareza</span>
        <span className="tabular-nums text-muted-foreground">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${clarezaColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// Mostra o feedback da IA: clareza, jargão, lacunas (→ conceitos), analogia, reescrita.
export function FeynmanFeedbackView({ feedback }: { feedback: FeynmanFeedback }) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-3">
      <ClarezaBar value={feedback.clareza} />

      {feedback.jargao.length > 0 && (
        <Section icon={<AlertTriangleIcon className="size-3.5 text-amber-500" />} title="Jargão sem explicar">
          <div className="flex flex-wrap gap-1.5">
            {feedback.jargao.map((j) => (
              <span key={j} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                {j}
              </span>
            ))}
          </div>
        </Section>
      )}

      {feedback.lacunas.length > 0 && (
        <Section icon={<AlertTriangleIcon className="size-3.5 text-destructive" />} title="Lacunas — o que revisar">
          <ul className="space-y-1">
            {feedback.lacunas.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                <span>{l.ponto}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {feedback.analogia && (
        <Section icon={<LightbulbIcon className="size-3.5 text-violet-500" />} title="Analogia sugerida">
          <p className="text-sm text-muted-foreground">{feedback.analogia}</p>
        </Section>
      )}

      {feedback.reescrita && (
        <Section icon={<PencilLineIcon className="size-3.5 text-primary" />} title="Reescrita para iniciante">
          <p className="text-sm text-muted-foreground">{feedback.reescrita}</p>
        </Section>
      )}

      {feedback.jargao.length === 0 && feedback.lacunas.length === 0 && feedback.clareza >= 70 && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="size-4" /> Explicação clara e sem lacunas — você domina isto.
        </p>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
