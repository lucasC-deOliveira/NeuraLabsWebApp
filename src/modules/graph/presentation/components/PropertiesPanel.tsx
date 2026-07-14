import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeftIcon, SparklesIcon } from "lucide-react";
import { useNotaMeta, type NotaMeta } from "../hooks/useNotaMeta";
import { useDeckStats } from "../hooks/useDeckStats";
import type { PropertiesNode, PropertiesEdge, DeckStats } from "./properties/properties-panel.types";
import { NodeSummary, NodeAiSection, NodeStudySection, DeckStatsView, NotaMetaView } from "./properties/PropertiesSections";
import { NodeRelations } from "./properties/NodeRelations";
import { NodeActions, GenerateDeckAction, NodePosition } from "./properties/NodeActions";

export interface PropertiesPanelProps {
  selectedNode: PropertiesNode | null;
  connectedEdges: PropertiesEdge[];
  isDark: boolean;
  onRemoveFromGraph: () => void;
  onDeleteNode: () => void;
  isDeleting: boolean;
  // Method signature (bivariant params) so callers may pass a richer node type.
  onFocusNode(node: PropertiesNode): void;
  onEditEdge?: (edge: PropertiesEdge) => void;
  onDeleteEdge?: (edge: PropertiesEdge) => void;
  onAddEdge?: () => void;
  onEditNode?: () => void;
  onViewNota?: () => void;
  onViewTextoBruto?: () => void;
  onViewProva?: () => void;
  onLinkEdital?: () => void;
  onStudyFlashcard?: () => void;
  onViewFlashcard?: () => void;
  onStudyDeck?: () => void;
  onViewDeck?: () => void;
  onStudyProva?: () => void;
  onStudyQuestao?: () => void;
  onStudyNeighborhood?: () => void;
  onGenerateInsights?: () => void;
  onExpandNode?: () => void;
  onImproveFlashcard?: () => void;
  onImproveQuestao?: () => void;
  onImproveNota?: () => void;
  onGenerateDeck?: () => void;
  onSelectNode?: (nodeId: string) => void;
  grafoId?: string;
  grafoNome?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  const { selectedNode } = props;
  const notaMeta = useNotaMeta(selectedNode);
  const deckStats = useDeckStats(selectedNode, props.grafoId, props.grafoNome);

  if (props.collapsed) {
    return (
      <div className="app-infopanel w-10 bg-background border-l border-primary/60 flex flex-col items-center py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={props.onToggleCollapse} title="Expandir painel">
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="app-infopanel w-80 bg-background border-l border-primary/60 flex flex-col text-primary">
      <div className="flex items-center gap-2 p-3 border-b border-primary/30">
        <div className="flex-1 font-medium text-sm truncate">{selectedNode ? "Propriedades" : "Informações"}</div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={props.onToggleCollapse}>
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!selectedNode ? (
          <EmptyState />
        ) : (
          <NodeContent props={props} node={selectedNode} notaMeta={notaMeta} deckStats={deckStats} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center text-muted-foreground text-sm py-10">
      <div className="size-10 rounded-full bg-violet-500/10 flex items-center justify-center">
        <SparklesIcon className="size-5 text-violet-500" />
      </div>
      <p className="font-medium text-foreground">Selecione um nó</p>
      <p className="text-xs leading-relaxed max-w-[180px]">
        Clique em qualquer nó para ver suas propriedades e acessar o assistente de IA
      </p>
    </div>
  );
}

interface NodeContentProps {
  props: PropertiesPanelProps;
  node: PropertiesNode;
  notaMeta: NotaMeta | null;
  deckStats: DeckStats | null;
}

function NodeContent({ props, node, notaMeta, deckStats }: NodeContentProps) {
  return (
    <div className="space-y-4">
      <NodeSummary node={node} connections={props.connectedEdges.length} />
      <Separator />
      <NodeAiSection node={node} onGenerateInsights={props.onGenerateInsights} onExpandNode={props.onExpandNode} onImproveFlashcard={props.onImproveFlashcard} onImproveQuestao={props.onImproveQuestao} onImproveNota={props.onImproveNota} />
      <NodeStudySection
        node={node}
        onStudyNeighborhood={props.onStudyNeighborhood}
        onStudyFlashcard={props.onStudyFlashcard}
        onViewFlashcard={props.onViewFlashcard}
        onStudyDeck={props.onStudyDeck}
        onViewDeck={props.onViewDeck}
        onStudyProva={props.onStudyProva}
        onStudyQuestao={props.onStudyQuestao}
      />
      <DeckStatsView node={node} stats={deckStats} />
      <NotaMetaView node={node} meta={notaMeta} />
      <NodeRelations
        node={node}
        edges={props.connectedEdges}
        isDark={props.isDark}
        onSelectNode={props.onSelectNode}
        onEditEdge={props.onEditEdge}
        onDeleteEdge={props.onDeleteEdge}
        onAddEdge={props.onAddEdge}
      />
      <NodePosition node={node} />
      <Separator />
      <GenerateDeckAction node={node} onGenerateDeck={props.onGenerateDeck} />
      <NodeActions
        node={node}
        isDeleting={props.isDeleting}
        onEditNode={props.onEditNode}
        onViewNota={props.onViewNota}
        onViewTextoBruto={props.onViewTextoBruto}
        onViewProva={props.onViewProva}
        onLinkEdital={props.onLinkEdital}
        onRemoveFromGraph={props.onRemoveFromGraph}
        onDeleteNode={props.onDeleteNode}
      />
    </div>
  );
}
