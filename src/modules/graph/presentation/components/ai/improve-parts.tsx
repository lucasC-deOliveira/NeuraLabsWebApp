import { CheckIcon, Loader2Icon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { ImproveFlashcardOperation } from "@/modules/graph/application/ports/graph-ai.port";
import { IMPROVE_OPS, type ImproveOptionMeta } from "./improve-ops";

// Peças compartilhadas pelos modais "Melhorar com IA" (flashcard e questão): a
// lista de opções e o rodapé melhorar/aplicar. As opções em si vivem em improve-ops.

export function ImproveLoadingRow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" />
      {text}
    </div>
  );
}

export function ImproveOptions({ ops, onToggle }: {
  ops: Set<ImproveFlashcardOperation>;
  onToggle: (id: ImproveFlashcardOperation) => void;
}) {
  return (
    <div className="space-y-2">
      {IMPROVE_OPS.map((op) => (
        <OptionRow key={op.id} op={op} active={ops.has(op.id)} onToggle={() => onToggle(op.id)} />
      ))}
      {ops.size === 0 && <p className="px-1 text-xs text-amber-600 dark:text-amber-400">Escolha ao menos uma melhoria.</p>}
    </div>
  );
}

function OptionRow({ op, active, onToggle }: { op: ImproveOptionMeta; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${active ? "border-violet-500/50 bg-violet-500/5" : "border-border hover:border-border/80"}`}
    >
      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${active ? "border-violet-500 bg-violet-500 text-white" : "border-muted-foreground/40"}`}>
        {active && <CheckIcon className="size-3" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{op.label}</span>
        <span className="block text-xs text-muted-foreground">{op.desc}</span>
      </span>
    </button>
  );
}

export function ImproveFooter({ hasResult, improving, applying, canImprove, onAdjust, onImprove, onApply }: {
  hasResult: boolean;
  improving: boolean;
  applying: boolean;
  canImprove: boolean;
  onAdjust: () => void;
  onImprove: () => void;
  onApply: () => void;
}) {
  if (hasResult) {
    return (
      <DialogFooter className="shrink-0">
        <Button variant="outline" onClick={onAdjust} disabled={applying}>Ajustar opções</Button>
        <Button onClick={onApply} disabled={applying} className="gap-2">
          {applying ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Aplicar
        </Button>
      </DialogFooter>
    );
  }
  return (
    <DialogFooter className="shrink-0">
      <Button
        onClick={onImprove}
        disabled={improving || applying || !canImprove}
        className="w-full gap-2 border-0 bg-violet-600 text-white hover:bg-violet-700"
      >
        {improving ? <Loader2Icon className="size-4 animate-spin" /> : <WandSparklesIcon className="size-4" />}
        {improving ? "Melhorando..." : "Melhorar com IA"}
      </Button>
    </DialogFooter>
  );
}
