"use client";

import { useState } from "react";
import { Loader2Icon, CheckCircle2Icon, CheckIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitCardReview, endStudySession } from "@/lib/study-api";
import type { PlannedSession, FlashcardItem, QuestionItem } from "@/lib/study-plan-api";

// Player da sessão do dia: percorre a fila intercalada de flashcards e questões.
export function PlannedSessionModal({ session, onClose }: {
  session: PlannedSession | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [prevId, setPrevId] = useState<string | null>(null);

  const sid = session?.sessionId ?? null;
  if (sid !== prevId) { setPrevId(sid); setIdx(0); }

  const items = session?.items ?? [];
  const item = items[idx] ?? null;
  const done = session !== null && idx >= items.length;
  const advance = (): void => setIdx((i) => i + 1);
  const close = (): void => {
    if (sid) endStudySession(sid).catch(() => {});
    onClose();
  };

  return (
    <Dialog open={session !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Estudo do dia</DialogTitle>
          <DialogDescription>
            {done
              ? "Sessão concluída"
              : `${Math.min(idx + 1, items.length)} de ${items.length} · intercalada por conceito`}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <Done onClose={close} />
        ) : item?.kind === "flashcard" && sid ? (
          <FlashcardStep key={item.id} card={item} sessionId={sid} onNext={advance} />
        ) : item?.kind === "question" ? (
          <QuestionStep key={item.id} q={item} onNext={advance} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Done({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
      <CheckCircle2Icon className="size-10 text-emerald-500" />
      <p className="text-sm text-muted-foreground">Você concluiu a sessão de hoje. 🎉</p>
      <Button onClick={onClose}>Fechar</Button>
    </div>
  );
}

function ConceptTag({ conceito }: { conceito: string | null }) {
  if (!conceito) return null;
  return (
    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-muted-foreground">
      {conceito}
    </span>
  );
}

type Grade = "again" | "hard" | "good" | "easy";
const GRADES: { id: Grade; label: string; className: string }[] = [
  { id: "again", label: "Errei", className: "bg-red-500/15 text-red-600 hover:bg-red-500/25" },
  { id: "hard", label: "Difícil", className: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25" },
  { id: "good", label: "Bom", className: "bg-sky-500/15 text-sky-600 hover:bg-sky-500/25" },
  { id: "easy", label: "Fácil", className: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25" },
];

function FlashcardStep({ card, sessionId, onNext }: {
  card: FlashcardItem;
  sessionId: string;
  onNext: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  const grade = (g: Grade): void => {
    setSaving(true);
    submitCardReview({ flashcardId: card.id, grade: g, sessaoId: sessionId })
      .catch(() => {})
      .finally(() => { setSaving(false); onNext(); });
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-auto py-4">
      <ConceptTag conceito={card.conceito} />
      <div className="rounded-lg border bg-background p-4 text-sm">{card.pergunta}</div>
      {revealed && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">{card.resposta}</div>
      )}
      <div className="flex justify-center pt-2">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Mostrar resposta</Button>
        ) : (
          <div className="grid w-full grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={saving}
                onClick={() => grade(g.id)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${g.className}`}
              >
                {saving ? <Loader2Icon className="mx-auto size-4 animate-spin" /> : g.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const VF_OPTIONS = [
  { letra: "V", texto: "Verdadeiro" },
  { letra: "F", texto: "Falso" },
];

const firstUpper = (s: string): string => s.trim().charAt(0).toUpperCase();

function QuestionStep({ q, onNext }: { q: QuestionItem; onNext: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const options = q.alternativas && q.alternativas.length > 0 ? q.alternativas : VF_OPTIONS;
  const correctLetra = (letra: string): boolean => firstUpper(letra) === firstUpper(q.gabarito);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-auto py-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Questão</span>
        <ConceptTag conceito={q.conceito} />
      </div>
      <div className="rounded-lg border bg-background p-4 text-sm">{q.enunciado}</div>
      <div className="space-y-2">
        {options.map((opt) => {
          const revealed = chosen !== null;
          const isCorrect = correctLetra(opt.letra);
          const picked = chosen === opt.letra;
          const tone = !revealed
            ? "border-border hover:border-primary/40"
            : isCorrect
              ? "border-emerald-500/50 bg-emerald-500/10"
              : picked
                ? "border-red-500/50 bg-red-500/10"
                : "border-border opacity-60";
          return (
            <button
              key={opt.letra}
              type="button"
              disabled={revealed}
              onClick={() => setChosen(opt.letra)}
              className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${tone}`}
            >
              <span className="font-semibold">{opt.letra}</span>
              <span className="flex-1">{opt.texto}</span>
              {revealed && isCorrect && <CheckIcon className="size-4 text-emerald-600" />}
              {revealed && picked && !isCorrect && <XIcon className="size-4 text-red-600" />}
            </button>
          );
        })}
      </div>
      {chosen !== null && q.explicacao && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
          {q.explicacao}
        </div>
      )}
      <div className="flex justify-center pt-2">
        <Button onClick={onNext} disabled={chosen === null} variant={chosen === null ? "outline" : "default"}>
          Próximo
        </Button>
      </div>
    </div>
  );
}
