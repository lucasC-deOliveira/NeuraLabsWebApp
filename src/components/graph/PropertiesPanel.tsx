"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trash2Icon,
  ChevronLeftIcon,
  Link2Icon,
  BookOpenIcon,
  XIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";

interface SimNode {
  id: string;
  label: string;
  group: string;
  dominio: number;
  x: number;
  y: number;
  tipoReal: string;
  parentId?: string;
  pergunta?: string;
  prioridadeRevisao: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

interface PropertiesPanelProps {
  selectedNode: SimNode | null;
  connectedEdges: Edge[];
  isDark: boolean;

  // Actions
  onRemoveFromGraph: () => void;
  onDeleteNode: () => void;
  isDeleting: boolean;
  onFocusNode: (node: any) => void;
  onEditEdge?: (edge: Edge) => void;
  onDeleteEdge?: (edge: Edge) => void;
  onAddEdge?: () => void;

  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PropertiesPanel({
  selectedNode,
  connectedEdges,
  isDark,
  onRemoveFromGraph,
  onDeleteNode,
  isDeleting,
  onFocusNode,
  onEditEdge,
  onDeleteEdge,
  onAddEdge,
  collapsed,
  onToggleCollapse,
}: PropertiesPanelProps) {
  const router = useRouter();

  if (collapsed) {
    return (
      <div className="app-infopanel w-10 bg-background border-l border-primary/60 flex flex-col items-center py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse} title="Expandir painel">
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="app-infopanel w-80 bg-background border-l border-primary/60 flex flex-col text-primary">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-primary/30">
        <div className="flex-1 font-medium text-sm truncate">
          {selectedNode ? "Propriedades" : "Informações"}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {!selectedNode ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p>Selecione um nó para ver suas propriedades</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Node Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {selectedNode.tipoReal.toLowerCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">ID: {selectedNode.id.slice(0, 8)}...</span>
              </div>
              <h3 className="font-semibold text-lg leading-tight mb-1">{selectedNode.label}</h3>
              {selectedNode.pergunta && (
                <p className="text-xs text-muted-foreground leading-relaxed">{selectedNode.pergunta}</p>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-primary/80">Domínio</span>
                  <span className="font-mono">{Math.round(selectedNode.dominio * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedNode.dominio * 100}%`,
                      backgroundColor: selectedNode.dominio >= 0.7 ? "#22c55e" : selectedNode.dominio >= 0.4 ? "#eab308" : selectedNode.dominio > 0 ? "#ef4444" : "#71717a",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-primary/80">Prioridade de revisão</span>
                <Badge variant={selectedNode.prioridadeRevisao >= 7 ? "destructive" : "secondary"} className="text-xs">
                  {selectedNode.prioridadeRevisao}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-primary/80">Conexões</span>
                <span className="font-mono">{connectedEdges.length}</span>
              </div>
            </div>

            <Separator />

            {/* Flashcard Study Button */}
            {selectedNode.tipoReal === "FLASHCARD" && (
              <>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => router.push(`/study?flashcard=${selectedNode.id}`)}
                >
                  <BookOpenIcon className="size-4" />
                  Estudar Flashcard
                </Button>
                <Separator />
              </>
            )}

            {/* Relações do nó — com editar/excluir */}
            <div>
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                Relações ({connectedEdges.length})
              </h4>
              {connectedEdges.length === 0 ? (
                <p className="text-xs text-muted-foreground">Este nó não tem relações neste grafo.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {connectedEdges.map((edge) => {
                    const isOutgoing = edge.source === selectedNode.id;
                    const otherNode = isOutgoing ? edge.targetLabel : edge.sourceLabel;
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center gap-2 p-2 bg-muted/60 rounded text-xs"
                      >
                        <div
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getRelationColor(edge.tipoRelacao, isDark) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{isOutgoing ? "→" : "←"}</span>
                            <span className="truncate">{otherNode}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {RELATION_LABELS[edge.tipoRelacao] || edge.tipoRelacao}
                          </div>
                        </div>
                        {onEditEdge && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Editar relação"
                            onClick={() => onEditEdge(edge)}
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                        )}
                        {onDeleteEdge && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Excluir relação"
                            onClick={() => onDeleteEdge(edge)}
                          >
                            <Trash2Icon className="size-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {onAddEdge && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 mt-2"
                  onClick={onAddEdge}
                >
                  <PlusIcon className="size-4" />
                  Nova relação
                </Button>
              )}
            </div>

            {/* Position */}
            <div className="text-xs text-muted-foreground">
              <div>Posição: ({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})</div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={onRemoveFromGraph}
                disabled={isDeleting}
              >
                <XIcon className="size-4" />
                Remover do grafo
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={onDeleteNode}
                disabled={isDeleting}
              >
                <Trash2Icon className="size-4" />
                Excluir permanentemente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
