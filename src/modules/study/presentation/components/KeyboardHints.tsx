"use client";

import type { Phase } from "../study-phase";

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">{children}</kbd>;
}

export function KeyboardHints({ phase }: { phase: Phase }) {
  if (phase !== "answer" && phase !== "question") return null;
  return (
    <div className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground">
      {phase === "question" && (
        <span><Kbd>Space</Kbd> revelar resposta</span>
      )}
      {phase === "answer" && (
        <>
          <span><Kbd>1</Kbd> Errei</span>
          <span><Kbd>2</Kbd> Acertei</span>
        </>
      )}
    </div>
  );
}
