import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, EyeIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { nowMs } from "@/lib/clock";
import { graphHttp } from "@/modules/graph/infra/http";
import type { StudyCard, CardReviewInput } from "@/modules/graph/application/ports/study.port";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { readAllVaultNodes, graphVaultDir } from "@/lib/vault-sync";
import type { VaultNode } from "@/lib/vault-format";
import {
  readSrsLog,
  startLocalSession,
  submitLocalReview,
  finalizeLocalSession,
  isDue,
  needsRequeue,
  type ReviewGrade,
  type LocalSchedule,
} from "@/lib/srs-local";
import { GradeGrid } from "./GradeGrid";

interface StudyDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
  grafoId?: string;
  grafoNome?: string;
  // Modo ego network: estuda estes flashcard IDs em vez de um baralho
  customFlashcardIds?: string[];
  customTitulo?: string;
}

interface QueueCard extends StudyCard {
  schedule: LocalSchedule | null;
}

type Phase = "loading" | "question" | "answer" | "saving" | "complete" | "error";
type SrsLog = Awaited<ReturnType<typeof readSrsLog>>;

// Result of resolving a deck to study — applied to component state by the effect.
type DeckOutcome =
  | { phase: "error" }
  | { phase: "complete"; titulo: string; totalNoDeck: number; graphDir: string | null; sessionId: string | null }
  | { phase: "question"; titulo: string; totalNoDeck: number; graphDir: string | null; sessionId: string; queue: QueueCard[] };

function finalizeSession(graphDir: string | null, sessionId: string): void {
  if (graphDir) finalizeLocalSession(graphDir, sessionId).catch(() => {});
  else graphHttp.finalizeStudySession(sessionId).catch(() => {});
}

function toQueueCard(n: VaultNode, schedule: LocalSchedule | null): QueueCard {
  return { id: n.id, pergunta: n.pergunta ?? "", resposta: n.resposta ?? "", conceito: null, schedule };
}

function dueCardsFrom(candidates: Array<VaultNode | undefined>, srsLog: SrsLog): QueueCard[] {
  return candidates
    .filter((n): n is VaultNode => !!n && n.tipo === "FLASHCARD" && isDue(srsLog.schedule[n.id]))
    .map((n) => toQueueCard(n, srsLog.schedule[n.id] ?? null));
}

async function readVaultDir(grafoId: string, grafoNome: string): Promise<{ dir: string; nodeById: Map<string, VaultNode>; srsLog: SrsLog } | null> {
  const vaultDir = await desktop.vault.getPath().catch(() => null);
  if (!vaultDir) return null;
  const dir = graphVaultDir(vaultDir, grafoId, grafoNome);
  const [vaultNodes, srsLog] = await Promise.all([readAllVaultNodes(grafoId, grafoNome), readSrsLog(dir)]);
  return { dir, nodeById: new Map(vaultNodes.map((n) => [n.id, n])), srsLog };
}

async function startQueue(dir: string, sessionKey: string | null, titulo: string, totalNoDeck: number, dueCards: QueueCard[]): Promise<DeckOutcome> {
  if (dueCards.length === 0) return { phase: "complete", titulo, totalNoDeck, graphDir: dir, sessionId: null };
  const sessionId = await startLocalSession(dir, sessionKey);
  return { phase: "question", titulo, totalNoDeck, graphDir: dir, sessionId, queue: dueCards };
}

async function loadNeighborhood(ids: string[], grafoId?: string, grafoNome?: string, customTitulo?: string): Promise<DeckOutcome> {
  if (!isDesktop() || !grafoId || !grafoNome) return { phase: "error" };
  const vault = await readVaultDir(grafoId, grafoNome);
  if (!vault) return { phase: "error" };
  const dueCards = dueCardsFrom(ids.map((id) => vault.nodeById.get(id)), vault.srsLog);
  return startQueue(vault.dir, "neighborhood-" + nowMs(), customTitulo ?? "Vizinhança", ids.length, dueCards);
}

// Returns null when the baralho is not yet pulled into the vault (caller falls back to API).
async function loadDeckFromVault(baralhoId: string, grafoId: string, grafoNome: string): Promise<DeckOutcome | null> {
  const vault = await readVaultDir(grafoId, grafoNome);
  if (!vault) return null;
  const baralho = vault.nodeById.get(baralhoId);
  if (!baralho || baralho.tipo !== "BARALHO") return null;
  const contained = baralho.relacoes.filter((r) => r.rel === "CONTEM");
  const dueCards = dueCardsFrom(contained.map((r) => vault.nodeById.get(r.alvo)), vault.srsLog);
  const titulo = baralho.titulo ?? baralho.nome ?? "Baralho";
  return startQueue(vault.dir, baralhoId, titulo, contained.length, dueCards);
}

async function loadDeckFromApi(baralhoId: string): Promise<DeckOutcome> {
  const deck = await graphHttp.startDeckStudy(baralhoId).catch(() => null);
  if (!deck) return { phase: "error" };
  if (deck.cards.length === 0) {
    finalizeSession(null, deck.sessionId);
    return { phase: "complete", titulo: deck.titulo, totalNoDeck: deck.totalNoDeck, graphDir: null, sessionId: null };
  }
  const queue: QueueCard[] = deck.cards.map((c) => ({ ...c, schedule: null }));
  return { phase: "question", titulo: deck.titulo, totalNoDeck: deck.totalNoDeck, graphDir: null, sessionId: deck.sessionId, queue };
}

// Not `async` so the API call is issued synchronously in the non-desktop path.
function loadDeck(props: StudyDeckModalProps): Promise<DeckOutcome> {
  const { baralhoId, grafoId, grafoNome, customFlashcardIds, customTitulo } = props;
  if (customFlashcardIds && customFlashcardIds.length > 0) {
    return loadNeighborhood(customFlashcardIds, grafoId, grafoNome, customTitulo);
  }
  if (!baralhoId) return Promise.resolve({ phase: "error" });
  if (isDesktop() && grafoId && grafoNome) {
    return loadDeckFromVault(baralhoId, grafoId, grafoNome).then((r) => r ?? loadDeckFromApi(baralhoId));
  }
  return loadDeckFromApi(baralhoId);
}

async function submitReview(
  graphDir: string | null,
  sessionId: string,
  input: { flashcardId: string; grade: ReviewGrade; tempoResposta: number },
  current: LocalSchedule | null,
): Promise<LocalSchedule | null> {
  if (graphDir) return submitLocalReview(graphDir, sessionId, input);
  await graphHttp.submitCardReview({ ...input, sessaoId: sessionId } as CardReviewInput);
  return current;
}

function ScheduleBadge({ schedule }: { schedule: LocalSchedule }) {
  const tone =
    schedule.fase === "LEARN" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : schedule.fase === "RELEARN" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
      : "bg-green-500/10 text-green-600 dark:text-green-400";
  const label =
    schedule.fase === "LEARN" ? "aprendendo"
      : schedule.fase === "RELEARN" ? "reaprendendo"
      : `revisão · ${schedule.intervalo}d`;
  return (
    <div className="flex justify-center">
      <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${tone}`}>{label}</span>
    </div>
  );
}

function DeckCardView({
  card,
  phase,
  onReveal,
  onGrade,
}: {
  card: QueueCard;
  phase: Phase;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}) {
  return (
    <div className="space-y-4">
      {card.schedule && <ScheduleBadge schedule={card.schedule} />}
      <FlashcardFace pergunta={card.pergunta} resposta={card.resposta} conceito={card.conceito} showAnswer={phase === "answer"} />
      {phase === "question" && (
        <Button size="lg" className="w-full gap-2" onClick={onReveal}>
          <EyeIcon className="size-4" />
          Ver resposta
        </Button>
      )}
      {phase === "answer" && <GradeGrid onGrade={onGrade} />}
    </div>
  );
}

function CompleteView({ queue, totalNoDeck, reviewed, onClose }: { queue: QueueCard[]; totalNoDeck: number; reviewed: number; onClose: () => void }) {
  const emptyHint = totalNoDeck === 0 ? "Este baralho não tem flashcards." : "Todos os flashcards estão em dia. Volte quando algum vencer.";
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <CheckCircle2Icon className="size-10 text-green-600 dark:text-green-500" />
      <p className="text-sm font-medium">{queue.length === 0 ? "Nada para revisar agora" : "Sessão concluída!"}</p>
      <p className="text-xs text-muted-foreground text-center">
        {queue.length === 0 ? emptyHint : `${reviewed} revisões registradas.`}
      </p>
      <Button onClick={onClose}>Fechar</Button>
    </div>
  );
}

function DeckHeader({
  titulo,
  phase,
  reviewed,
  queue,
  index,
}: {
  titulo: string;
  phase: Phase;
  reviewed: number;
  queue: QueueCard[];
  index: number;
}) {
  // Cards únicos restantes (sem contar re-queued duplicates)
  const uniqueRemaining = queue.slice(index).filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i).length;
  const showProgress = queue.length > 0 && phase !== "complete" && phase !== "error";
  const description =
    phase === "question" ? "Pense na resposta e revele quando estiver pronto."
      : phase === "answer" ? "Como foi?"
      : phase === "complete" ? "Sessão concluída."
      : " ";
  return (
    <DialogHeader className="shrink-0">
      <DialogTitle className="flex items-center justify-between gap-2">
        <span className="truncate">Estudar: {titulo || "baralho"}</span>
        {showProgress && (
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {reviewed} revisados · {uniqueRemaining} restantes
          </span>
        )}
      </DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

function DeckBody({
  phase,
  card,
  queue,
  totalNoDeck,
  reviewed,
  onClose,
  onReveal,
  onGrade,
}: {
  phase: Phase;
  card: QueueCard | null;
  queue: QueueCard[];
  totalNoDeck: number;
  reviewed: number;
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
    return <p className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar este baralho.</p>;
  }
  if (phase === "complete") {
    return <CompleteView queue={queue} totalNoDeck={totalNoDeck} reviewed={reviewed} onClose={onClose} />;
  }
  if (!card) return null;
  return <DeckCardView card={card} phase={phase} onReveal={onReveal} onGrade={onGrade} />;
}

export function StudyDeckModal(props: StudyDeckModalProps) {
  const { open, onOpenChange, baralhoId, customFlashcardIds } = props;
  const [phase, setPhase] = useState<Phase>("loading");
  const [titulo, setTitulo] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphDir, setGraphDir] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [totalNoDeck, setTotalNoDeck] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [startedAt, setStartedAt] = useState(nowMs);
  const [prevKey, setPrevKey] = useState("");
  const finalizedRef = useRef(false);

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && (baralhoId || customFlashcardIds) ? `${baralhoId ?? ""}:${(customFlashcardIds ?? []).join(",")}` : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setPhase("loading"); setQueue([]); setIndex(0); setReviewed(0); setSessionId(null); setGraphDir(null); }
  }

  const applyDeckOutcome = (outcome: DeckOutcome): void => {
    if (outcome.phase === "error") { setPhase("error"); return; }
    setTitulo(outcome.titulo);
    setTotalNoDeck(outcome.totalNoDeck);
    setGraphDir(outcome.graphDir);
    if (outcome.phase === "complete") { setPhase("complete"); return; }
    setSessionId(outcome.sessionId);
    setQueue(outcome.queue);
    setStartedAt(nowMs());
    setPhase("question");
  };

  useEffect(() => {
    if (!open || (!baralhoId && !customFlashcardIds)) return;
    let active = true;
    finalizedRef.current = false;
    loadDeck(props)
      .then((outcome): void => {
        if (!active) {
          if (outcome.phase === "question") finalizeSession(outcome.graphDir, outcome.sessionId);
          return;
        }
        applyDeckOutcome(outcome);
      })
      .catch((): void => { if (active) setPhase("error"); });
    return (): void => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baralhoId]);

  const card = queue[index] ?? null;

  const advanceOrComplete = (newQueue: QueueCard[]): void => {
    const nextIndex = index + 1;
    if (nextIndex >= newQueue.length) {
      finalizedRef.current = true;
      if (sessionId) finalizeSession(graphDir, sessionId);
      setPhase("complete");
      return;
    }
    setIndex(nextIndex);
    setStartedAt(nowMs());
    setPhase("question");
  };

  const handleGrade = async (grade: ReviewGrade): Promise<void> => {
    if (!card || !sessionId) return;
    setPhase("saving");
    try {
      const input = { flashcardId: card.id, grade, tempoResposta: nowMs() - startedAt };
      const newSchedule = await submitReview(graphDir, sessionId, input, card.schedule);
      setReviewed((r) => r + 1);
      const shouldRequeue = newSchedule && needsRequeue(newSchedule);
      const newQueue = shouldRequeue ? [...queue, { ...card, schedule: newSchedule }] : queue;
      if (shouldRequeue) setQueue(newQueue);
      advanceOrComplete(newQueue);
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
        <DeckHeader titulo={titulo} phase={phase} reviewed={reviewed} queue={queue} index={index} />

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <DeckBody
            phase={phase}
            card={card}
            queue={queue}
            totalNoDeck={totalNoDeck}
            reviewed={reviewed}
            onClose={() => onOpenChange(false)}
            onReveal={() => setPhase("answer")}
            onGrade={handleGrade}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
