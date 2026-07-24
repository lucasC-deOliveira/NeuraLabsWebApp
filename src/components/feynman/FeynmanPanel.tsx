"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SparklesIcon, Loader2Icon, SaveIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeFeynman, saveFeynmanSession } from "@/lib/feynman-api";
import type { FeynmanAlvoTipo, FeynmanAngulo, FeynmanFeedback } from "./feynman.types";
import { FEYNMAN_ANGULOS, ANGULO_META, FEYNMAN_CLARO } from "./feynman-angulos";
import { FeynmanFeedbackView } from "./FeynmanFeedbackView";

interface AngleState {
  texto: string;
  feedback: FeynmanFeedback | null;
  loading: boolean;
  error: string | null;
}

const emptyAngle = (): AngleState => ({ texto: "", feedback: null, loading: false, error: null });
const initialAll = (): Record<FeynmanAngulo, AngleState> => ({
  SIMPLES: emptyAngle(),
  ANALOGIA: emptyAngle(),
  TECNICO: emptyAngle(),
});

const isClear = (s: AngleState): boolean => !!s.feedback && s.feedback.clareza >= FEYNMAN_CLARO;

// Miolo da Feynman em 3 ângulos: explique o MESMO alvo de 3 formas (Simples/Analogia/
// Técnico), cada uma avaliada pela IA; conclui quando as 3 ficam claras. Reseta ao
// trocar de alvo. `footerLeft` é o slot da navegação do modo em série.
export function FeynmanPanel({ alvoTipo, alvoId, footerLeft, onSaved }: {
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string | null;
  footerLeft?: ReactNode;
  onSaved?: () => void;
}) {
  const [byAngulo, setByAngulo] = useState<Record<FeynmanAngulo, AngleState>>(initialAll);
  const [active, setActive] = useState<FeynmanAngulo>("SIMPLES");
  const [saving, setSaving] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(alvoId);

  if (alvoId !== prevId) {
    setPrevId(alvoId);
    setByAngulo(initialAll());
    setActive("SIMPLES");
    setSaving(false);
  }

  const patch = (a: FeynmanAngulo, p: Partial<AngleState>): void =>
    setByAngulo((prev) => ({ ...prev, [a]: { ...prev[a], ...p } }));

  const avaliar = (): void => {
    const angulo = active;
    const cur = byAngulo[angulo];
    if (!alvoId || !cur.texto.trim()) return;
    patch(angulo, { loading: true, error: null });
    gradeFeynman(alvoTipo, alvoId, cur.texto, angulo)
      .then((fb) => patch(angulo, { feedback: fb, loading: false }))
      .catch((e) =>
        patch(angulo, { error: e instanceof Error ? e.message : "Erro ao avaliar.", loading: false }),
      );
  };

  const salvar = (): void => {
    const explicacoes = FEYNMAN_ANGULOS.map((a) => ({ a, st: byAngulo[a] }))
      .filter((x) => x.st.feedback)
      .map((x) => ({
        angulo: x.a,
        texto: x.st.texto,
        clareza: (x.st.feedback as FeynmanFeedback).clareza,
        lacunas: (x.st.feedback as FeynmanFeedback).lacunas,
        jargao: (x.st.feedback as FeynmanFeedback).jargao,
      }));
    if (!alvoId || explicacoes.length === 0) return;
    setSaving(true);
    saveFeynmanSession(alvoTipo, alvoId, explicacoes)
      .then(() => {
        toast.success("Explicações salvas — viraram uma nota no grafo e a revisão foi agendada.");
        onSaved?.();
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  };

  const cur = byAngulo[active];
  const savable = FEYNMAN_ANGULOS.some((a) => byAngulo[a].feedback);
  const allClear = FEYNMAN_ANGULOS.every((a) => isClear(byAngulo[a]));

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto py-4">
        <AngleTabs byAngulo={byAngulo} active={active} onSelect={setActive} />
        {allClear && (
          <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" /> Conceito dominado — você o explicou de 3 formas.
          </p>
        )}
        <p className="text-xs text-muted-foreground">{ANGULO_META[active].hint}</p>
        <textarea
          value={cur.texto}
          onChange={(e) => patch(active, { texto: e.target.value })}
          placeholder={`Sua explicação (${ANGULO_META[active].label.toLowerCase()})…`}
          rows={6}
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary/60"
        />
        {cur.error && <p className="text-sm text-destructive">{cur.error}</p>}
        {cur.feedback && <FeynmanFeedbackView feedback={cur.feedback} />}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-2">{footerLeft}</div>
        <div className="flex items-center gap-2">
          {savable && (
            <Button variant="outline" onClick={salvar} disabled={saving} className="gap-2">
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Salvar
            </Button>
          )}
          <Button onClick={avaliar} disabled={cur.loading || !cur.texto.trim()} className="gap-2">
            {cur.loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
            {cur.feedback ? "Reavaliar" : "Avaliar com IA"}
          </Button>
        </div>
      </div>
    </>
  );
}

// Abas dos 3 ângulos com o status de cada um (pendente · clareza obtida).
function AngleTabs({ byAngulo, active, onSelect }: {
  byAngulo: Record<FeynmanAngulo, AngleState>;
  active: FeynmanAngulo;
  onSelect: (a: FeynmanAngulo) => void;
}) {
  return (
    <div className="flex gap-2">
      {FEYNMAN_ANGULOS.map((a, i) => {
        const on = a === active;
        return (
          <button
            key={a}
            type="button"
            onClick={() => onSelect(a)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
          >
            <span className="tabular-nums opacity-60">{i + 1}</span>
            {ANGULO_META[a].label}
            <AngleStatus state={byAngulo[a]} />
          </button>
        );
      })}
    </div>
  );
}

function AngleStatus({ state }: { state: AngleState }) {
  if (!state.feedback) return <span className="size-1.5 rounded-full bg-muted-foreground/40" />;
  const clear = state.feedback.clareza >= FEYNMAN_CLARO;
  return (
    <span
      className={`tabular-nums ${clear ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
    >
      {state.feedback.clareza}
    </span>
  );
}
