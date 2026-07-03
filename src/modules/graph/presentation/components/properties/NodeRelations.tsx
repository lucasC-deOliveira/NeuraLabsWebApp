import { Button } from "@/components/ui/button";
import { Trash2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import type { PropertiesNode, PropertiesEdge } from "./properties-panel.types";

interface NodeRelationsProps {
  node: PropertiesNode;
  edges: PropertiesEdge[];
  isDark: boolean;
  onSelectNode?: (nodeId: string) => void;
  onEditEdge?: (edge: PropertiesEdge) => void;
  onDeleteEdge?: (edge: PropertiesEdge) => void;
  onAddEdge?: () => void;
}

export function NodeRelations(props: NodeRelationsProps) {
  const { node, edges } = props;
  return (
    <div>
      <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Relações ({edges.length})</h4>
      {edges.length === 0 ? (
        <p className="text-xs text-muted-foreground">Este nó não tem relações neste grafo.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {edges.map((edge) => (
            <RelationRow key={edge.id} edge={edge} nodeId={node.id} {...props} />
          ))}
        </div>
      )}
      {props.onAddEdge && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-2" onClick={props.onAddEdge}>
          <PlusIcon className="size-4" />
          Nova relação
        </Button>
      )}
    </div>
  );
}

interface RelationRowProps extends NodeRelationsProps {
  edge: PropertiesEdge;
  nodeId: string;
}

function RelationRow({ edge, nodeId, isDark, onSelectNode, onEditEdge, onDeleteEdge }: RelationRowProps) {
  const isOutgoing = edge.source === nodeId;
  const otherId = isOutgoing ? edge.target : edge.source;
  const otherLabel = isOutgoing ? edge.targetLabel : edge.sourceLabel;
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/60 rounded text-xs">
      <div
        className="size-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: getRelationColor(edge.tipoRelacao, isDark) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{isOutgoing ? "→" : "←"}</span>
          {onSelectNode ? (
            <button
              className="truncate text-left hover:underline hover:text-primary transition-colors"
              onClick={() => onSelectNode(otherId)}
              title={`Ir para ${otherLabel}`}
            >
              {otherLabel}
            </button>
          ) : (
            <span className="truncate">{otherLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="capitalize">{RELATION_LABELS[edge.tipoRelacao] || edge.tipoRelacao}</span>
          <span className="rounded bg-muted px-1 font-mono not-italic tabular-nums">
            peso {Number(edge.peso.toFixed(2))}
          </span>
        </div>
      </div>
      {onEditEdge && (
        <Button size="icon-sm" variant="ghost" title="Editar relação" onClick={() => onEditEdge(edge)}>
          <PencilIcon className="size-3" />
        </Button>
      )}
      {onDeleteEdge && (
        <Button size="icon-sm" variant="ghost" title="Excluir relação" onClick={() => onDeleteEdge(edge)}>
          <Trash2Icon className="size-3 text-red-500" />
        </Button>
      )}
    </div>
  );
}
