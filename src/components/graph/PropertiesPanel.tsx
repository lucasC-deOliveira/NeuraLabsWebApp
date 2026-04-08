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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  getNodeColors: (type: string, dark: boolean) => { bg: string; border: string; text: string };
  getRelColor: (type: string, dark: boolean) => string;
  RELATION_LABELS: Record<string, string>;

  // Actions
  onRemoveFromGraph: () => void;
  onDeleteNode: () => void;
  isDeleting: boolean;
  onFocusNode: (node: any) => void;

  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PropertiesPanel({
  selectedNode,
  connectedEdges,
  isDark,
  getNodeColors,
  getRelColor,
  RELATION_LABELS,
  onRemoveFromGraph,
  onDeleteNode,
  isDeleting,
  onFocusNode,
  collapsed,
  onToggleCollapse,
}: PropertiesPanelProps) {
  const router = useRouter();

  if (collapsed) {
    return (
      <div className="w-10 bg-zinc-100 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse} title="Expandir painel">
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-100 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
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
          <div className="text-center text-zinc-500 text-sm py-8">
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
                <span className="text-xs text-zinc-500">ID: {selectedNode.id.slice(0, 8)}...</span>
              </div>
              <h3 className="font-semibold text-lg leading-tight mb-1">{selectedNode.label}</h3>
              {selectedNode.pergunta && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{selectedNode.pergunta}</p>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Domínio</span>
                  <span className="font-mono">{Math.round(selectedNode.dominio * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
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
                <span className="text-zinc-600 dark:text-zinc-400">Prioridade de revisão</span>
                <Badge variant={selectedNode.prioridadeRevisao >= 7 ? "destructive" : "secondary"} className="text-xs">
                  {selectedNode.prioridadeRevisao}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">Conexões</span>
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

            {/* Connections */}
            {connectedEdges.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Conexões</h4>
                <div className="space-y-2">
                  {connectedEdges.slice(0, 5).map((edge) => {
                    const isOutgoing = edge.source === selectedNode.id;
                    const otherNode = isOutgoing ? edge.targetLabel : edge.sourceLabel;
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-xs"
                      >
                        <div
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getRelColor(edge.tipoRelacao, isDark) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">{isOutgoing ? "→" : "←"}</span>
                            <span className="truncate">{otherNode}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 capitalize">{RELATION_LABELS[edge.tipoRelacao] || edge.tipoRelacao}</div>
                        </div>
                      </div>
                    );
                  })}
                  {connectedEdges.length > 5 && (
                    <p className="text-xs text-zinc-500 text-center">+{connectedEdges.length - 5} mais</p>
                  )}
                </div>
              </div>
            )}

            {/* Position */}
            <div className="text-xs text-zinc-500">
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
