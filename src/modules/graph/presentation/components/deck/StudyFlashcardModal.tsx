import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, EyeIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { nowMs } from "@/lib/clock";
import { graphHttp } from "@/modules/graph/infra/http";
import type { StudyCard } from "@/modules/graph/application/ports/study.port";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { GradeGrid } from "./GradeGrid";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { findVaultNode, graphVaultDir } from "@/lib/vault-sync";
import {
  readSrsLog,
  startLocalSession,
  submitLocalReview,
  finalizeLocalSession,
  isDue,
  type ReviewGrade,
} from "@/lib/srs-local";

interface StudyFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

type Phase = "loading" | "question" | "answer" | "saving" | "done" | "notdue" | "error";

// Result of resolving a card to study — applied to component state by the effect.
type CardOutcome =
  | { phase: "error" }
  | { phase: "notdue"; card: StudyCard; graphDir: string | null; proximaRevisao: string | null }
  | { phase: "question"; card: StudyCard; graphDir: string | null; sessionId: string };

function formatProxima(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "agora";
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours < 24) return `em ${hours}h`;
  const dias = Math.ceil(diffMs / 86_400_000);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (dias === 1) return `amanhã (${data})`;
  return `em ${dias} dias (${data})`;
}

function finalizeSession(graphDir: string | null, sessionId: string): void {
  if (graphDir) finalizeLocalSession(graphDir, sessionId).catch(() => {});
  else graphHttp.finalizeStudySession(sessionId).catch(() => {});
}

async function loadCardFromVault(flashcardId: string, grafoId: string, grafoNome: string): Promise<CardOutcome> {
  const vaultDir = await desktop.vault.getPath().catch(() => null);
  if (!vaultDir) return { phase: "error" };
  const dir = graphVaultDir(vaultDir, grafoId, grafoNome);
  const [vn, srsLog] = await Promise.all([
    findVaultNode(grafoId, grafoNome, flashcardId, "FLASHCARD"),
    readSrsLog(dir),
  ]);
  if (!vn) return { phase: "error" };
  const schedule = srsLog.schedule[flashcardId];
  const card: StudyCard = {
    id: vn.id,
    pergunta: vn.pergunta ?? "",
    resposta: vn.resposta ?? "",
    conceito: null,
    schedule: schedule ?? null,
    // Card único não tem fila para ordenar: o peso não faz diferença aqui.
    importancia: null,
  };
  if (!isDue(schedule)) return { phase: "notdue", card, graphDir: dir, proximaRevisao: schedule!.proximaRevisao };
  const sessionId = await startLocalSession(dir, null);
  return { phase: "question", card, graphDir: dir, sessionId };
}

async function loadCardFromApi(flashcardId: string): Promise<CardOutcome> {
  const res = await graphHttp.startSingleCardStudy(flashcardId).catch(() => null);
  if (!res) return { phase: "error" };
  if (res.due && res.sessionId) return { phase: "question", card: res.card, graphDir: null, sessionId: res.sessionId };
  return { phase: "notdue", card: res.card, graphDir: null, proximaRevisao: res.proximaRevisao };
}

// Not `async` so the API call is issued synchronously in the non-desktop path.
function loadCard(flashcardId: string, grafoId?: string, grafoNome?: string): Promise<CardOutcome> {
  if (isDesktop() && grafoId && grafoNome) return loadCardFromVault(flashcardId, grafoId, grafoNome);
  return loadCardFromApi(flashcardId);
}

function CardView({
  card,
  phase,
  onReveal,
  onGrade,
}: {
  card: StudyCard;
  phase: Phase;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}) {
  return (
    <div className="space-y-4">
      <FlashcardFace pergunta={card.pergunta} resposta={card.resposta} conceito={card.conceito} showAnswer={phase === "answer"} />
      {phase === "question" && (
        <Button size="lg" className="w-full gap-2" onClick={onReveal}>
          <EyeIcon className="size-4" />
          Ver resposta
        </Button>
      )}
      {phase === "answer" && <GradeGrid onGrade={onGrade} schedule={card.schedule} />}
    </div>
  );
}

function StudyBody({
  phase,
  card,
  proximaRevisao,
  onClose,
  onReveal,
  onGrade,
}: {
  phase: Phase;
  card: StudyCard | null;
  proximaRevisao: string | null;
  onClose: () => void;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}) {
  if (phase === "loading" || phase === "saving") {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        {phase === "saving" ? "Salvando..." : "Carregando..."}
      </div>
    );
  }
  if (phase === "error") {
    return <p className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar este flashcard.</p>;
  }
  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <CheckCircle2Icon className="size-10 text-green-600 dark:text-green-500" />
        <p className="text-sm text-muted-foreground">Revisão registrada com sucesso.</p>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    );
  }
  if (phase === "notdue") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ClockIcon className="size-10 text-muted-foreground" />
        <p className="text-sm font-medium">Ainda não é hora de revisar</p>
        <p className="text-xs text-muted-foreground">
          Pela repetição espaçada, este flashcard estará disponível{" "}
          {proximaRevisao ? formatProxima(proximaRevisao) : "em breve"}.
        </p>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    );
  }
  if (!card) return null;
  return <CardView card={card} phase={phase} onReveal={onReveal} onGrade={onGrade} />;
}

export function StudyFlashcardModal({ open, onOpenChange, flashcardId, grafoId, grafoNome }: StudyFlashcardModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [card, setCard] = useState<StudyCard | null>(null);
  const [proximaRevisao, setProximaRevisao] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(nowMs);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphDir, setGraphDir] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState("");
  const finalizedRef = useRef(false);

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && flashcardId ? flashcardId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setPhase("loading"); setCard(null); setSessionId(null); setGraphDir(null); }
  }

  const applyCardOutcome = (outcome: CardOutcome): void => {
    if (outcome.phase === "error") { setPhase("error"); return; }
    setCard(outcome.card);
    setGraphDir(outcome.graphDir);
    if (outcome.phase === "notdue") {
      setProximaRevisao(outcome.proximaRevisao);
      setPhase("notdue");
      return;
    }
    setSessionId(outcome.sessionId);
    setStartedAt(nowMs());
    setPhase("question");
  };

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    finalizedRef.current = false;
    loadCard(flashcardId, grafoId, grafoNome)
      .then((outcome): void => {
        if (!active) {
          if (outcome.phase === "question") finalizeSession(outcome.graphDir, outcome.sessionId);
          return;
        }
        applyCardOutcome(outcome);
      })
      .catch((): void => { if (active) setPhase("error"); });
    return (): void => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flashcardId]);

  const handleGrade = async (grade: ReviewGrade): Promise<void> => {
    if (!card) return;
    setPhase("saving");
    try {
      if (graphDir && sessionId) {
        await submitLocalReview(graphDir, sessionId, { flashcardId: card.id, grade, tempoResposta: nowMs() - startedAt });
        finalizedRef.current = true;
        await finalizeLocalSession(graphDir, sessionId).catch(() => {});
      } else if (sessionId) {
        await graphHttp.submitCardReview({ flashcardId: card.id, grade, tempoResposta: nowMs() - startedAt, sessaoId: sessionId });
        finalizedRef.current = true;
        await graphHttp.finalizeStudySession(sessionId).catch(() => {});
      }
      setPhase("done");
      toast.success("Revisão registrada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a revisão");
      setPhase("answer");
    }
  };

  const handleOpenChange = (o: boolean): void => {
    if (!o && sessionId && !finalizedRef.current) {
      finalizedRef.current = true;
      finalizeSession(graphDir, sessionId);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Estudar flashcard</DialogTitle>
          <DialogDescription>
            {phase === "question" ? "Pense na resposta e revele quando estiver pronto."
              : phase === "answer" ? "Como foi?"
              : phase === "done" ? "Revisão salva."
              : " "}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <StudyBody
            phase={phase}
            card={card}
            proximaRevisao={proximaRevisao}
            onClose={() => onOpenChange(false)}
            onReveal={() => setPhase("answer")}
            onGrade={handleGrade}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
