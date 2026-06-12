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
  EyeIcon,
  XIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNodeDetails } from "@/actions/graph";

const SUBTIPO_LABELS: Record<string, string> = {
  DEFINICAO: "Definição",
  EXPLICACAO: "Explicação",
  EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação",
  SINTESE: "Síntese",
  PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum",
  APLICACAO: "Aplicação",
};

const TIPO_NOTA_LABELS: Record<string, string> = {
  LITERATURA: "Nota de referência",
  PERMANENTE: "Nota permanente",
  ESTRUTURA: "Nota de estrutura",
};
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
  onEditNode?: () => void;
  onViewNota?: () => void;
  onStudyFlashcard?: () => void;
  onViewFlashcard?: () => void;
  onStudyDeck?: () => void;
  onViewDeck?: () => void;

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
  onEditNode,
  onViewNota,
  onStudyFlashcard,
  onViewFlashcard,
  onStudyDeck,
  onViewDeck,
  collapsed,
  onToggleCollapse,
}: PropertiesPanelProps) {
  const router = useRouter();

  // metadados Zettelkasten da nota selecionada (slug + datas)
  const [notaMeta, setNotaMeta] = useState<Record<string, string | null> | null>(null);
  const isNota = selectedNode?.tipoReal === "NOTA";
  useEffect(() => {
    setNotaMeta(null);
    if (!isNota || !selectedNode) return;
    getNodeDetails("NOTA", selectedNode.id)
      .then(setNotaMeta)
      .catch(() => setNotaMeta(null));
  }, [isNota, selectedNode?.id]);

  // texto original (fonte) do nó TEXTO_BRUTO selecionado
  const [textoBruto, setTextoBruto] = useState<Record<string, string | null> | null>(null);
  const isTextoBruto = selectedNode?.tipoReal === "TEXTO_BRUTO";
  useEffect(() => {
    setTextoBruto(null);
    if (!isTextoBruto || !selectedNode) return;
    getNodeDetails("TEXTO_BRUTO", selectedNode.id)
      .then(setTextoBruto)
      .catch(() => setTextoBruto(null));
  }, [isTextoBruto, selectedNode?.id]);

  const formatDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
      : null;

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

            {/* Flashcard: estudar (com repetição espaçada) ou só ver o conteúdo */}
            {selectedNode.tipoReal === "FLASHCARD" && (onStudyFlashcard || onViewFlashcard) && (
              <>
                {onStudyFlashcard && (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={onStudyFlashcard}
                  >
                    <BookOpenIcon className="size-4" />
                    Estudar Flashcard
                  </Button>
                )}
                {onViewFlashcard && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={onViewFlashcard}
                  >
                    <EyeIcon className="size-4" />
                    Ver conteúdo
                  </Button>
                )}
                <Separator />
              </>
            )}

            {/* Deck: estudar (com repetição espaçada) ou ver os flashcards */}
            {selectedNode.tipoReal === "BARALHO" && (onStudyDeck || onViewDeck) && (
              <>
                {onStudyDeck && (
                  <Button size="sm" className="w-full gap-2" onClick={onStudyDeck}>
                    <BookOpenIcon className="size-4" />
                    Estudar Baralho
                  </Button>
                )}
                {onViewDeck && (
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={onViewDeck}>
                    <EyeIcon className="size-4" />
                    Ver conteúdo
                  </Button>
                )}
                <Separator />
              </>
            )}

            {/* Texto original (fonte) */}
            {isTextoBruto && textoBruto?.texto && (
              <>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Texto original
                  </h4>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-primary/30 bg-muted/40 p-2 text-xs leading-relaxed whitespace-pre-wrap">
                    {textoBruto.texto}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Metadados da nota (slug + datas) */}
            {isNota && notaMeta && (
              <>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Metadados
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {notaMeta.tipoNota && (
                      <Badge variant="outline" className="text-[10px]">
                        {TIPO_NOTA_LABELS[notaMeta.tipoNota] ?? notaMeta.tipoNota}
                      </Badge>
                    )}
                    {notaMeta.subtipo && (
                      <Badge variant="secondary" className="text-[10px]">
                        {SUBTIPO_LABELS[notaMeta.subtipo] ?? notaMeta.subtipo}
                      </Badge>
                    )}
                  </div>
                  {notaMeta.fonte && (
                    <p className="text-xs text-muted-foreground">Fonte: {notaMeta.fonte}</p>
                  )}
                  {notaMeta.slug && (
                    <p className="text-[11px] font-mono text-muted-foreground break-all">
                      {notaMeta.slug}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Criada em {formatDate(notaMeta.dataCriacao)}</p>
                    {notaMeta.dataAtualizacao &&
                      notaMeta.dataAtualizacao !== notaMeta.dataCriacao && (
                        <p>Modificada em {formatDate(notaMeta.dataAtualizacao)}</p>
                      )}
                  </div>
                </div>
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
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="capitalize">
                              {RELATION_LABELS[edge.tipoRelacao] || edge.tipoRelacao}
                            </span>
                            <span className="rounded bg-muted px-1 font-mono not-italic tabular-nums">
                              peso {Number(edge.peso.toFixed(2))}
                            </span>
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
              {onEditNode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onEditNode}
                >
                  <PencilIcon className="size-4" />
                  Editar
                </Button>
              )}
              {selectedNode.tipoReal === "NOTA" && onViewNota && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onViewNota}
                >
                  <BookOpenIcon className="size-4" />
                  Mostrar conteúdo
                </Button>
              )}
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
