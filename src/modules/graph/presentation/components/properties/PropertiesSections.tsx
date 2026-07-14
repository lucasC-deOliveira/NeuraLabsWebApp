import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon, WandSparklesIcon, BookOpenIcon, EyeIcon, GraduationCapIcon } from "lucide-react";
import type { PropertiesNode, DeckStats } from "./properties-panel.types";
import type { NotaMeta } from "../../hooks/useNotaMeta";
import { SUBTIPO_LABELS, TIPO_NOTA_LABELS, formatPanelDate, domainColor } from "./properties-panel.labels";

const AI_TYPES = ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD"];
const EXPAND_TYPES = ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA"];

function DomainBar({ dominio }: { dominio: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-primary/80">Domínio</span>
        <span className="font-mono">{Math.round(dominio * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${dominio * 100}%`, backgroundColor: domainColor(dominio) }}
        />
      </div>
    </div>
  );
}

export function NodeSummary({ node, connections }: { node: PropertiesNode; connections: number }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">{node.tipoReal.toLowerCase()}</Badge>
          <span className="text-xs text-muted-foreground">ID: {node.id.slice(0, 8)}...</span>
        </div>
        <h3 className="font-semibold text-lg leading-tight mb-1">{node.label}</h3>
        {node.pergunta && <p className="text-xs text-muted-foreground leading-relaxed">{node.pergunta}</p>}
      </div>
      <Separator />
      <div className="space-y-3">
        <DomainBar dominio={node.dominio} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-primary/80">Prioridade de revisão</span>
          <Badge variant={node.prioridadeRevisao >= 7 ? "destructive" : "secondary"} className="text-xs">
            {node.prioridadeRevisao}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-primary/80">Conexões</span>
          <span className="font-mono">{connections}</span>
        </div>
      </div>
    </>
  );
}

interface AiProps {
  node: PropertiesNode;
  onGenerateInsights?: () => void;
  onExpandNode?: () => void;
  onImproveFlashcard?: () => void;
  onImproveQuestao?: () => void;
  onImproveNota?: () => void;
}

function improveHandler(
  tipo: string,
  handlers: { flashcard?: () => void; questao?: () => void; nota?: () => void },
): (() => void) | undefined {
  if (tipo === "FLASHCARD") return handlers.flashcard;
  if (tipo === "QUESTION") return handlers.questao;
  if (tipo === "NOTA") return handlers.nota;
  return undefined;
}

export function NodeAiSection({ node, onGenerateInsights, onExpandNode, onImproveFlashcard, onImproveQuestao, onImproveNota }: AiProps) {
  const onImprove = improveHandler(node.tipoReal, { flashcard: onImproveFlashcard, questao: onImproveQuestao, nota: onImproveNota });
  const showStandard = AI_TYPES.includes(node.tipoReal) && (!!onGenerateInsights || !!onExpandNode);
  if (!showStandard && !onImprove) return null;
  return (
    <>
      <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <SparklesIcon className="size-3.5 text-violet-500" />
          <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">IA</span>
        </div>
        {showStandard && onGenerateInsights && (
          <Button size="sm" className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0" onClick={onGenerateInsights}>
            <SparklesIcon className="size-3.5" />
            Insights da IA
          </Button>
        )}
        {showStandard && onExpandNode && EXPAND_TYPES.includes(node.tipoReal) && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/60"
            onClick={onExpandNode}
          >
            <WandSparklesIcon className="size-3.5" />
            Expandir com IA
          </Button>
        )}
        {onImprove && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/60"
            onClick={onImprove}
          >
            <WandSparklesIcon className="size-3.5" />
            Melhorar com IA
          </Button>
        )}
      </div>
      <Separator />
    </>
  );
}

interface StudyProps {
  node: PropertiesNode;
  onStudyNeighborhood?: () => void;
  onStudyFlashcard?: () => void;
  onViewFlashcard?: () => void;
  onStudyDeck?: () => void;
  onViewDeck?: () => void;
  onStudyProva?: () => void;
  onStudyQuestao?: () => void;
}

export function NodeStudySection(props: StudyProps) {
  return (
    <>
      <NeighborhoodAction node={props.node} onStudyNeighborhood={props.onStudyNeighborhood} />
      <FlashcardActions node={props.node} onStudy={props.onStudyFlashcard} onView={props.onViewFlashcard} />
      <DeckActions node={props.node} onStudy={props.onStudyDeck} onView={props.onViewDeck} />
      <QuizStudyAction node={props.node} onStudyProva={props.onStudyProva} onStudyQuestao={props.onStudyQuestao} />
    </>
  );
}

// Quiz/simulado para PROVA (a prova toda) e QUESTION (uma questão).
function QuizStudyAction({ node, onStudyProva, onStudyQuestao }: {
  node: PropertiesNode;
  onStudyProva?: () => void;
  onStudyQuestao?: () => void;
}) {
  const isProva = node.tipoReal === "PROVA";
  const isQuestao = node.tipoReal === "QUESTION";
  const onStudy = isProva ? onStudyProva : isQuestao ? onStudyQuestao : undefined;
  if (!onStudy) return null;
  return (
    <>
      <Button size="sm" className="w-full gap-2" onClick={onStudy}>
        <GraduationCapIcon className="size-4" />
        Estudar {isProva ? "prova" : "questão"}
      </Button>
      <Separator />
    </>
  );
}

function NeighborhoodAction({ node, onStudyNeighborhood }: { node: PropertiesNode; onStudyNeighborhood?: () => void }) {
  if (!onStudyNeighborhood || !EXPAND_TYPES.includes(node.tipoReal)) return null;
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
        onClick={onStudyNeighborhood}
        title="Estuda os flashcards conectados a este nó e seus vizinhos"
      >
        <BookOpenIcon className="size-4" />
        Estudar vizinhança
      </Button>
      <Separator />
    </>
  );
}

interface StudyPairProps {
  node: PropertiesNode;
  onStudy?: () => void;
  onView?: () => void;
}

function FlashcardActions({ node, onStudy, onView }: StudyPairProps) {
  if (node.tipoReal !== "FLASHCARD" || (!onStudy && !onView)) return null;
  return (
    <>
      {onStudy && (
        <Button size="sm" className="w-full gap-2" onClick={onStudy}>
          <BookOpenIcon className="size-4" />
          Estudar Flashcard
        </Button>
      )}
      {onView && (
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={onView}>
          <EyeIcon className="size-4" />
          Ver conteúdo
        </Button>
      )}
      <Separator />
    </>
  );
}

function DeckActions({ node, onStudy, onView }: StudyPairProps) {
  if (node.tipoReal !== "BARALHO" || (!onStudy && !onView)) return null;
  return (
    <>
      {onStudy && (
        <Button size="sm" className="w-full gap-2" onClick={onStudy}>
          <BookOpenIcon className="size-4" />
          Estudar Baralho
        </Button>
      )}
      {onView && (
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={onView}>
          <EyeIcon className="size-4" />
          Ver conteúdo
        </Button>
      )}
      <Separator />
    </>
  );
}

export function DeckStatsView({ node, stats }: { node: PropertiesNode; stats: DeckStats | null }) {
  if (node.tipoReal !== "BARALHO" || !stats) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-md bg-muted/60 px-2 py-2">
          <div className="text-base font-semibold tabular-nums">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">total</div>
        </div>
        <div className="rounded-md bg-blue-500/10 px-2 py-2">
          <div className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">{stats.novos}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">novos</div>
        </div>
        <div className="rounded-md bg-amber-500/10 px-2 py-2">
          <div className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">{stats.paraRevisar}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">revisar</div>
        </div>
      </div>
      <Separator />
    </>
  );
}

export function NotaMetaView({ node, meta }: { node: PropertiesNode; meta: NotaMeta | null }) {
  if (node.tipoReal !== "NOTA" || !meta) return null;
  const modified = meta.dataAtualizacao && meta.dataAtualizacao !== meta.dataCriacao;
  return (
    <>
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Metadados</h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.tipoNota && (
            <Badge variant="outline" className="text-[10px]">{TIPO_NOTA_LABELS[meta.tipoNota] ?? meta.tipoNota}</Badge>
          )}
          {meta.subtipo && (
            <Badge variant="secondary" className="text-[10px]">{SUBTIPO_LABELS[meta.subtipo] ?? meta.subtipo}</Badge>
          )}
        </div>
        {meta.fonte && <p className="text-xs text-muted-foreground">Fonte: {meta.fonte}</p>}
        {meta.slug && <p className="text-[11px] font-mono text-muted-foreground break-all">{meta.slug}</p>}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Criada em {formatPanelDate(meta.dataCriacao)}</p>
          {modified && <p>Modificada em {formatPanelDate(meta.dataAtualizacao)}</p>}
        </div>
      </div>
      <Separator />
    </>
  );
}
