import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, GraduationCapIcon, ClockIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import { MarkdownContent } from "@/components/markdown-content";
import type { QuestaoAlternativa } from "@/modules/graph/application/ports/graph-prova.port";

// Quiz/simulado: shows each answerable question without the answer, the user
// picks, gets immediate feedback (right/wrong + explanation) and a final score.
// Source is a whole prova (provaId) or a single question (questaoId).

interface StudyProvaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provaId: string | null;
  questaoId: string | null;
}

interface QuizQuestao {
  id: string;
  tipo: "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";
  enunciado: string;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
}

const VF_OPTIONS: QuestaoAlternativa[] = [
  { letra: "V", texto: "Verdadeiro" },
  { letra: "F", texto: "Falso" },
];

// Only questions with an actual answer can be quizzed (annulled/unanswered out).
function answerable(gabarito: string): boolean {
  return gabarito !== "" && gabarito !== "?" && gabarito !== "ANULADA";
}

function fmtTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function loadQuestoes(provaId: string | null, questaoId: string | null): Promise<QuizQuestao[]> {
  if (questaoId) {
    const q = await graphHttp.getQuestao(questaoId);
    return q ? [q].filter((x) => answerable(x.gabarito)) : [];
  }
  if (provaId) {
    const prova = await graphHttp.getProva(provaId);
    return (prova?.questoes ?? []).filter((q) => answerable(q.gabarito));
  }
  return [];
}

export function StudyProvaModal({ open, onOpenChange, provaId, questaoId }: StudyProvaModalProps) {
  const [loading, setLoading] = useState(false);
  const [questoes, setQuestoes] = useState<QuizQuestao[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [finished, setFinished] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questaoSeconds, setQuestaoSeconds] = useState(0);
  const [loadKey, setLoadKey] = useState("");

  // Reset during render when the source changes (react-hooks forbids setState in effect body).
  const key = open ? `${provaId ?? ""}|${questaoId ?? ""}` : "";
  if (key !== loadKey) {
    setLoadKey(key);
    setIdx(0); setSelected(null); setRevealed(false); setAcertos(0); setFinished(false);
    setTotalSeconds(0); setQuestaoSeconds(0);
    if (key) { setLoading(true); setQuestoes([]); }
  }

  useEffect(() => {
    if (!open || (!provaId && !questaoId)) return;
    let ignore = false;
    loadQuestoes(provaId, questaoId)
      .then((qs) => { if (!ignore) setQuestoes(qs); })
      .catch(() => { if (!ignore) setQuestoes([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [open, provaId, questaoId]);

  const questao = questoes[idx];
  const active = !loading && questoes.length > 0 && !finished;
  const isLast = idx + 1 >= questoes.length;
  const single = questaoId !== null; // estudo de uma questão isolada: sem "total"

  // One clock ticks for the whole session (total) and the per-question time; it
  // stops when the quiz finishes.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTotalSeconds((t) => t + 1);
      setQuestaoSeconds((q) => q + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const reveal = (): void => {
    if (selected === null || revealed) return;
    if (selected === questao.gabarito) setAcertos((a) => a + 1);
    setRevealed(true);
  };

  const next = (): void => {
    if (isLast) { setFinished(true); return; }
    setIdx((i) => i + 1); setSelected(null); setRevealed(false); setQuestaoSeconds(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <GraduationCapIcon className="size-4" />
            Estudar {questaoId ? "questão" : "prova"}
          </DialogTitle>
          {active && (
            <DialogDescription className="flex items-center gap-3">
              {!single && <span>Questão {idx + 1} de {questoes.length}</span>}
              <span className="ml-auto flex items-center gap-1 tabular-nums" title="Tempo nesta questão">
                <ClockIcon className="size-3.5" /> {fmtTime(questaoSeconds)}
              </span>
              {!single && (
                <span className="tabular-nums text-muted-foreground/70" title="Tempo total">
                  total {fmtTime(totalSeconds)}
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <QuizContent
            loading={loading}
            count={questoes.length}
            finished={finished}
            questao={questao}
            selected={selected}
            revealed={revealed}
            onSelect={(v) => !revealed && setSelected(v)}
            acertos={acertos}
            totalSeconds={totalSeconds}
            single={single}
            onRestart={() => setLoadKey("")}
          />
        </div>

        <DialogFooter>
          <QuizFooter
            active={active}
            revealed={revealed}
            canReveal={selected !== null}
            isLast={isLast}
            onReveal={reveal}
            onNext={next}
            onClose={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizFooter({ active, revealed, canReveal, isLast, onReveal, onNext, onClose }: {
  active: boolean;
  revealed: boolean;
  canReveal: boolean;
  isLast: boolean;
  onReveal: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {active &&
        (revealed ? (
          <Button className="flex-1" onClick={onNext}>{isLast ? "Ver resultado" : "Próxima"}</Button>
        ) : (
          <Button className="flex-1" onClick={onReveal} disabled={!canReveal}>Responder</Button>
        ))}
      <Button variant="outline" onClick={onClose}>Fechar</Button>
    </>
  );
}

function QuizContent({ loading, count, finished, questao, selected, revealed, onSelect, acertos, totalSeconds, single, onRestart }: {
  loading: boolean;
  count: number;
  finished: boolean;
  questao: QuizQuestao | undefined;
  selected: string | null;
  revealed: boolean;
  onSelect: (value: string) => void;
  acertos: number;
  totalSeconds: number;
  single: boolean;
  onRestart: () => void;
}) {
  if (loading) return <div className="flex justify-center py-12"><Loader2Icon className="size-6 animate-spin" /></div>;
  if (count === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nenhuma questão respondível (todas anuladas ou sem gabarito).
      </p>
    );
  }
  if (finished) return <QuizResult acertos={acertos} total={count} totalSeconds={totalSeconds} single={single} onRestart={onRestart} />;
  if (!questao) return null;
  return <QuizQuestion questao={questao} selected={selected} revealed={revealed} onSelect={onSelect} />;
}

function QuizQuestion({ questao, selected, revealed, onSelect }: {
  questao: QuizQuestao;
  selected: string | null;
  revealed: boolean;
  onSelect: (value: string) => void;
}) {
  const options = questao.tipo === "VERDADEIRO_FALSO" ? VF_OPTIONS : (questao.alternativas ?? []);
  return (
    <div className="space-y-3 p-1">
      <div className="text-sm font-medium leading-snug"><MarkdownContent>{questao.enunciado}</MarkdownContent></div>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <QuizOption
            key={opt.letra}
            letra={opt.letra}
            texto={opt.texto}
            state={optionState(opt.letra, questao.gabarito, selected, revealed)}
            onClick={() => onSelect(opt.letra)}
          />
        ))}
      </div>
    </div>
  );
}

type OptionState = "idle" | "selected" | "correct" | "wrong";

function optionState(letra: string, gabarito: string, selected: string | null, revealed: boolean): OptionState {
  if (!revealed) return selected === letra ? "selected" : "idle";
  if (letra === gabarito) return "correct";
  if (selected === letra) return "wrong";
  return "idle";
}

const OPTION_STYLES: Record<OptionState, string> = {
  idle: "border-border hover:border-primary/40 hover:bg-accent/50",
  selected: "border-primary bg-primary/5 ring-1 ring-primary",
  correct: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  wrong: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

function QuizOption({ letra, texto, state, onClick }: { letra: string; texto: string; state: OptionState; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${OPTION_STYLES[state]}`}
    >
      <span className="mt-0.5 shrink-0">
        {state === "correct" ? <CheckCircle2Icon className="size-4" />
          : state === "wrong" ? <XCircleIcon className="size-4" />
          : <span className="font-mono text-xs opacity-70">{letra}.</span>}
      </span>
      <span className="min-w-0 flex-1">{texto}</span>
    </button>
  );
}

function QuizResult({ acertos, total, totalSeconds, single, onRestart }: { acertos: number; total: number; totalSeconds: number; single: boolean; onRestart: () => void }) {
  const pct = Math.round((acertos / total) * 100);
  const media = Math.round(totalSeconds / total);
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <GraduationCapIcon className="size-12 text-primary" />
      <p className="text-lg font-semibold">{acertos} de {total} corretas</p>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{pct}% de acerto</p>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
        <ClockIcon className="size-3.5" />
        {single ? `Tempo ${fmtTime(totalSeconds)}` : `Tempo total ${fmtTime(totalSeconds)} · média ${fmtTime(media)}/questão`}
      </p>
      <Button variant="outline" size="sm" onClick={onRestart}>Refazer</Button>
    </div>
  );
}
