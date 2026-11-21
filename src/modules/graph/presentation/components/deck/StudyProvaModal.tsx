import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, GraduationCapIcon, ClockIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import { MarkdownContent } from "@/components/markdown-content";
import type { QuestaoAlternativa, AnswerDraft, ExamProgress, ExamProgressPort, GraphExamStudyPort, QuestaoView } from "@/modules/graph/application/ports/graph-prova.port";

// Quiz/simulado: shows each answerable question without the answer, the user
// picks, gets immediate feedback (right/wrong + explanation) and a final score.
// Source is a whole prova (provaId) or a single question (questaoId).

interface StudyProvaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provaId: string | null;
  questaoId: string | null;
  studyPort?: GraphExamStudyPort;
}

type QuizQuestao = QuestaoView;
type AttemptStatus = "saved" | "failed" | null;
const ATTEMPT_FEEDBACK = {
  saving: "Salvando tentativa no vault…",
  saved: "Tentativa salva no vault.",
  failed: "Não foi possível salvar a tentativa no vault.",
};

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

async function loadQuestoes(port: GraphExamStudyPort, provaId: string | null, questaoId: string | null): Promise<QuizQuestao[]> {
  if (questaoId) {
    const q = await port.getQuestao(questaoId);
    return q ? [q].filter((x) => answerable(x.gabarito)) : [];
  }
  if (provaId) {
    const prova = await port.getProva(provaId);
    return (prova?.questoes ?? []).filter((q) => answerable(q.gabarito));
  }
  return [];
}

function examQuestionKey(questions: QuizQuestao[]): string {
  return JSON.stringify(questions.map(({ id, tipo, gabarito, alternativas }) =>
    [id, tipo, gabarito, alternativas?.map(({ letra }) => letra)]));
}

async function restoreExamProgress(
  port: ExamProgressPort, examId: string, questions: QuizQuestao[],
): Promise<{ progress: ExamProgress | null; notice?: string }> {
  try {
    const progress = await port.read(examId);
    if (progress === null) return { progress };
    if (progress.questionKey === examQuestionKey(questions) && progress.index < questions.length) {
      return { progress, notice: "Progresso recuperado do vault." };
    }
    return { progress: null, notice: "A ordem das questões ou o gabarito mudou. A prova começa do início." };
  } catch {
    return { progress: null, notice: "Não foi possível recuperar o progresso do vault. A prova começa do início." };
  }
}

export function StudyProvaModal({ open, onOpenChange, provaId, questaoId, studyPort }: StudyProvaModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<QuizQuestao[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [finished, setFinished] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questaoSeconds, setQuestaoSeconds] = useState(0);
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const [loadKey, setLoadKey] = useState("");
  const [restartCount, setRestartCount] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const [checkpointFailed, setCheckpointFailed] = useState(false);
  const localExamId = questaoId === null ? provaId : null;
  const progressPort = studyPort?.progress;

  // Reset during render when the source changes (react-hooks forbids setState in effect body).
  const key = open ? [provaId, questaoId, restartCount].join("|") : "";
  if (key !== loadKey) {
    setLoadKey(key);
    setIdx(0); setSelected(null); setRevealed(false); setAcertos(0); setFinished(false);
    setTotalSeconds(0); setQuestaoSeconds(0); setAnswers([]);
    setAttemptStatus(null);
    setLoadError(null);
    setAttemptId(null);
    setProgressNotice(null);
    setCheckpointFailed(false);
    if (key) { setLoading(true); setQuestoes([]); }
  }

  useEffect(() => {
    if (!open || (!provaId && !questaoId)) return;
    let ignore = false;
    loadQuestoes(studyPort ?? graphHttp, provaId, questaoId)
      .then(async (qs) => {
        const restored = progressPort && localExamId && qs.length > 0
          ? await restoreExamProgress(progressPort, localExamId, qs)
          : null;
        if (ignore) return;
        setQuestoes(qs);
        if (!restored) return;
        const progress = restored.progress;
        setProgressNotice(restored.notice ?? null);
        setAttemptId(progress?.attemptId ?? crypto.randomUUID());
        if (!progress) return;
        setIdx(progress.index); setSelected(progress.selected); setRevealed(progress.revealed);
        setTotalSeconds(progress.totalSeconds); setQuestaoSeconds(progress.questionSeconds);
        setAcertos(progress.answers.filter(({ acertou }) => acertou).length);
        setAnswers(progress.answers);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setQuestoes([]);
        setLoadError(studyLoadError(error, Boolean(studyPort)));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [open, provaId, questaoId, studyPort, loadKey, localExamId, progressPort]);

  const questao = questoes[idx];
  const active = open && !loading && questoes.length > 0 && !finished;
  const isLast = idx + 1 >= questoes.length;
  const single = questaoId !== null; // estudo de uma questão isolada: sem "total"
  const questionKey = useMemo(() => examQuestionKey(questoes), [questoes]);

  function saveCheckpoint(): void {
    if (!active || !progressPort || !localExamId || !attemptId) return;
    void progressPort.save(localExamId, {
      attemptId, questionKey, index: idx, selected, revealed, totalSeconds, questionSeconds: questaoSeconds, answers,
    }).then(() => setCheckpointFailed(false), () => setCheckpointFailed(true));
  }

  const checkpoint = useEffectEvent(saveCheckpoint);
  useEffect(() => { checkpoint(); }, [active, idx, selected, revealed, attemptId]);
  useEffect(() => {
    if (!active || !progressPort || !attemptId) return;
    const interval = setInterval(() => checkpoint(), 10_000);
    return () => clearInterval(interval);
  }, [active, progressPort, attemptId]);

  function changeOpen(nextOpen: boolean): void {
    if (!nextOpen) saveCheckpoint();
    onOpenChange(nextOpen);
  }

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
    const acertou = selected === questao.gabarito;
    if (acertou) setAcertos((a) => a + 1);
    setAnswers((prev) => [
      ...prev,
      { questaoId: questao.id, respostaEscolhida: selected, acertou, tempoRespostaMs: questaoSeconds * 1000 },
    ]);
    setRevealed(true);
  };

  // Questão isolada não gera tentativa. Uma prova salva no mesmo meio em que foi aberta.
  useEffect(() => {
    if (!finished || single || !provaId || answers.length === 0) return;
    let activeAttempt = true;
    const attempt = { acertos, total: questoes.length, tempoTotalMs: totalSeconds * 1000, respostas: answers };
    const submission = progressPort && attemptId
      ? progressPort.finish(provaId, attemptId, attempt)
      : (studyPort ?? graphHttp).recordProvaAttempt(provaId, attempt);
    void submission
      .then(() => { if (studyPort && activeAttempt) setAttemptStatus("saved"); })
      .catch(() => { if (studyPort && activeAttempt) setAttemptStatus("failed"); });
    return () => { activeAttempt = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const next = (): void => {
    if (isLast) { saveCheckpoint(); setFinished(true); return; }
    setIdx((i) => i + 1); setSelected(null); setRevealed(false); setQuestaoSeconds(0);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-2xl">
        <QuizHeader active={active} single={single} index={idx} count={questoes.length}
          questionSeconds={questaoSeconds} totalSeconds={totalSeconds} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <QuizContent
            error={loadError}
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
            onRestart={studyPort && attemptStatus !== "saved" && !single ? undefined : () => setRestartCount((count) => count + 1)}
          />
        </div>
        <VaultAttemptFeedback local={Boolean(studyPort)} single={single} finished={finished} status={attemptStatus} />
        <QuizProgressFeedback active={active} attemptId={attemptId} failed={checkpointFailed} notice={progressNotice} />

        <DialogFooter>
          <QuizFooter
            active={active}
            revealed={revealed}
            canReveal={selected !== null}
            isLast={isLast}
            onReveal={reveal}
            onNext={next}
            onClose={() => changeOpen(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizHeader({ active, single, index, count, questionSeconds, totalSeconds }: {
  active: boolean; single: boolean; index: number; count: number; questionSeconds: number; totalSeconds: number;
}) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-primary">
        <GraduationCapIcon className="size-4" />
        {single ? "Estudar questão" : "Estudar prova"}
      </DialogTitle>
      {active && (
        <DialogDescription className="flex items-center gap-3">
          {!single && <span>Questão {index + 1} de {count}</span>}
          <span className="ml-auto flex items-center gap-1 tabular-nums" title="Tempo nesta questão">
            <ClockIcon className="size-3.5" /> {fmtTime(questionSeconds)}
          </span>
          {!single && (
            <span className="tabular-nums text-muted-foreground/70" title="Tempo total">
              total {fmtTime(totalSeconds)}
            </span>
          )}
        </DialogDescription>
      )}
    </DialogHeader>
  );
}

function QuizProgressFeedback({ active, attemptId, failed, notice }: {
  active: boolean; attemptId: string | null; failed: boolean; notice: string | null;
}) {
  if (!active || !attemptId) return null;
  if (failed) return <p role="alert" className="text-sm text-muted-foreground">Não foi possível salvar o progresso no vault.</p>;
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {notice && <p role="status">{notice}</p>}
      <p>Ao fechar, você pode retomar a prova depois. A tentativa fica disponível para envio após abrir o resultado.</p>
    </div>
  );
}

function VaultAttemptFeedback({ local, single, finished, status }: {
  local: boolean; single: boolean; finished: boolean; status: AttemptStatus;
}) {
  if (!local || single || !finished) return null;
  return <p role={status === "failed" ? "alert" : "status"} className="text-sm text-muted-foreground">
    {ATTEMPT_FEEDBACK[status ?? "saving"]}
  </p>;
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

function studyLoadError(error: unknown, local: boolean): string {
  if (local && error instanceof Error) return error.message;
  return "Não foi possível carregar as questões. Confira a conexão com o servidor.";
}

function QuizContent({ loading, error, count, finished, questao, selected, revealed, onSelect, acertos, totalSeconds, single, onRestart }: {
  loading: boolean;
  error: string | null;
  count: number;
  finished: boolean;
  questao: QuizQuestao | undefined;
  selected: string | null;
  revealed: boolean;
  onSelect: (value: string) => void;
  acertos: number;
  totalSeconds: number;
  single: boolean;
  onRestart?: () => void;
}) {
  if (loading) return <div className="flex justify-center py-12"><Loader2Icon className="size-6 animate-spin" /></div>;
  if (error) return <p role="alert" className="py-8 text-center text-sm text-muted-foreground">{error}</p>;
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
      {revealed && questao.explicacao && <div className="rounded-md bg-muted p-3 text-sm"><MarkdownContent>{questao.explicacao}</MarkdownContent></div>}
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

function QuizResult({ acertos, total, totalSeconds, single, onRestart }: { acertos: number; total: number; totalSeconds: number; single: boolean; onRestart?: () => void }) {
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
      {onRestart && <Button variant="outline" size="sm" onClick={onRestart}>Refazer</Button>}
    </div>
  );
}
