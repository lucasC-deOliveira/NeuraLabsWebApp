"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusIcon, Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAllowedRelations,
  canRelate,
} from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { getGraphNodes, createEdge, updateEdge, deleteEdge } from "@/lib/graph-api";

interface Edge {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

interface EdgeManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  existingEdges: Edge[];
  onSuccess?: () => void;
  // quando informados, o modal abre direto no formulário de nova relação
  // com origem/destino pré-selecionados (ex.: 2 nós selecionados no grafo)
  initialSourceId?: string;
  initialTargetId?: string;
  // quando informado, o modal abre direto na edição desta relação
  initialEditEdge?: Edge | null;
}

const RELATION_GROUPS = [
  {
    title: "Nota → Conceito",
    types: [
      { value: "DEFINE", label: "define" },
      { value: "EXPLICA", label: "explica" },
      { value: "APROFUNDA", label: "aprofunda" },
      { value: "EXEMPLIFICA", label: "exemplifica" },
      { value: "CONTRASTA", label: "contrasta" },
      { value: "SINTETIZA", label: "sintetiza" },
      { value: "ALERTA_ERRO", label: "alerta erro" },
    ],
  },
  {
    title: "Conceito ↔ Conceito",
    types: [
      { value: "IS_A", label: "é um" },
      { value: "PART_OF", label: "parte de" },
      { value: "PREREQUISITO", label: "pré-requisito" },
      { value: "DERIVA_DE", label: "deriva de" },
      { value: "EVOLUI_PARA", label: "evolui para" },
      { value: "REFORCA", label: "reforça" },
      { value: "ALTERNATIVA_A", label: "alternativa" },
      { value: "CONTRASTA_COM", label: "contrasta com" },
      { value: "CONFUNDE_COM", label: "confunde com" },
      { value: "ANTI_PADRAO_DE", label: "anti-padrão" },
      { value: "MEDIDO_POR", label: "medido por" },
      { value: "OBJETIVO_DE", label: "objetivo de" },
    ],
  },
  {
    title: "Conceito ↔ Tópico",
    types: [
      { value: "PERTENCE_A", label: "pertence a" },
      { value: "FUNDAMENTA", label: "fundamenta" },
      { value: "APLICADO_EM", label: "aplicado em" },
    ],
  },
  {
    title: "Tópico ↔ Tópico",
    types: [
      { value: "SUBTOPICO_DE", label: "subtópico de" },
      { value: "RELACIONADO", label: "relacionado" },
      { value: "DEPENDE_DE", label: "depende de" },
      { value: "EVOLUI_PARA", label: "evolui para" },
    ],
  },
  {
    title: "Hierárquicas",
    types: [
      { value: "GERA", label: "gera" },
      { value: "HERDA", label: "herda" },
      { value: "REFERENCIA", label: "referência" },
    ],
  },
];

export function EdgeManagerModal({
  open,
  onOpenChange,
  grafoId,
  existingEdges,
  onSuccess,
  initialSourceId,
  initialTargetId,
  initialEditEdge,
}: EdgeManagerModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<Array<{ id: string; label: string; type: string }>>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [formData, setFormData] = useState({
    sourceNodeId: "",
    targetNodeId: "",
    tipoRelacao: "",
    peso: 1.0,
  });

  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, { label: string; type: string }>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // tipos dos nós escolhidos → relações permitidas para o par
  const sourceType = nodeMap.get(formData.sourceNodeId)?.type;
  const targetType = nodeMap.get(formData.targetNodeId)?.type;
  const allowedRelations =
    sourceType && targetType ? getAllowedRelations(sourceType, targetType) : [];

  useEffect(() => {
    if (open) {
      // Load nodes from graph
      fetchNodes();
      if (initialEditEdge) {
        setSelectedEdge(initialEditEdge);
        setFormData({
          sourceNodeId: initialEditEdge.source,
          targetNodeId: initialEditEdge.target,
          tipoRelacao: initialEditEdge.tipoRelacao,
          peso: initialEditEdge.peso,
        });
        setMode("edit");
      } else if (initialSourceId) {
        // com origem (e opcionalmente destino) pré-selecionada, vai direto à criação
        setFormData({
          sourceNodeId: initialSourceId,
          targetNodeId: initialTargetId ?? "",
          tipoRelacao: "",
          peso: 1.0,
        });
        setMode("add");
      } else {
        setMode("list");
      }
    }
  }, [open, initialSourceId, initialTargetId, initialEditEdge]);

  const fetchNodes = async () => {
    try {
      const { nodes } = await getGraphNodes(grafoId);
      setNodes(nodes.map((n) => ({ id: n.id, label: n.label, type: n.type })));
    } catch (e) {
      toast.error("Erro ao carregar nós do grafo");
    }
  };

  const resetForm = () => {
    setFormData({ sourceNodeId: "", targetNodeId: "", tipoRelacao: "", peso: 1.0 });
    setSelectedEdge(null);
    setMode("list");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleAdd = () => {
    if (!formData.sourceNodeId || !formData.targetNodeId || !formData.tipoRelacao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (formData.sourceNodeId === formData.targetNodeId) {
      toast.error("Origem e destino não podem ser o mesmo nó");
      return;
    }
  };

  const handleEdit = () => {
    if (!formData.tipoRelacao) {
      toast.error("Selecione um tipo de relação");
      return;
    }
  };

  const handleSubmit = async () => {
    if (mode === "add") {
      await handleAddSubmit();
    } else if (mode === "edit") {
      await handleEditSubmit();
    }
  };

  const handleAddSubmit = async () => {
    if (!formData.sourceNodeId || !formData.targetNodeId || !formData.tipoRelacao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (formData.sourceNodeId === formData.targetNodeId) {
      toast.error("Origem e destino não podem ser o mesmo nó");
      return;
    }

    setLoading(true);
    try {
      await createEdge(grafoId, {
        sourceNodeId: formData.sourceNodeId,
        targetNodeId: formData.targetNodeId,
        tipoRelacao: formData.tipoRelacao,
        peso: formData.peso,
      });
      toast.success("Relação criada com sucesso!");
      resetForm();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar relação");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedEdge || !formData.tipoRelacao) {
      toast.error("Dados incompletos");
      return;
    }

    setLoading(true);
    try {
      await updateEdge(selectedEdge.id, grafoId, { tipoRelacao: formData.tipoRelacao, peso: formData.peso });
      toast.success("Relação atualizada com sucesso!");
      resetForm();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar relação");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (edgeId: string) => {
    if (!confirm("Tem certeza que deseja remover esta relação?")) return;

    setLoading(true);
    try {
      await deleteEdge(edgeId, grafoId);
      toast.success("Relação removida com sucesso!");
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover relação");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (edge: Edge) => {
    setSelectedEdge(edge);
    setFormData({
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      tipoRelacao: edge.tipoRelacao,
      peso: edge.peso,
    });
    setMode("edit");
  };

  const startAdd = () => {
    resetForm();
    setMode("add");
  };

  const getRelationLabel = (type: string) => {
    const group = RELATION_GROUPS.find((g) => g.types.some((t) => t.value === type));
    const typeInfo = group?.types.find((t) => t.value === type);
    return typeInfo?.label || type;
  };

  // Filter out edges that would create duplicates (same source/target with same direction)
  const getAvailableTargets = (sourceId: string, excludeEdgeId?: string) => {
    const srcType = nodeMap.get(sourceId)?.type;
    const usedTargets = existingEdges
      .filter((e) => e.id !== excludeEdgeId && e.source === sourceId)
      .map((e) => e.target);
    return nodes.filter(
      (n) =>
        n.id !== sourceId &&
        !usedTargets.includes(n.id) &&
        // só tipos que têm alguma relação permitida com a origem
        (!srcType || canRelate(srcType, n.type))
    );
  };

  const getAvailableSources = (targetId: string, excludeEdgeId?: string) => {
    const usedSources = existingEdges
      .filter((e) => e.id !== excludeEdgeId && e.target === targetId)
      .map((e) => e.source);
    return nodes.filter((n) => n.id !== targetId && !usedSources.includes(n.id));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "list" && "Gerenciar relações do grafo"}
            {mode === "add" && "Adicionar nova relação"}
            {mode === "edit" && "Editar relação"}
          </DialogTitle>
          <DialogDescription>
            {mode === "list" && "Crie, edite ou remova relações entre os nós do grafo."}
            {mode === "add" && "Selecione os nós e o tipo de relação."}
            {mode === "edit" && "Altere o tipo e peso da relação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "list" && (
            <>
              <Button onClick={startAdd} className="w-full gap-1.5">
                <PlusIcon className="size-4" />
                Nova relação
              </Button>

              {existingEdges.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Nenhuma relação criada ainda.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto px-1">
                  {existingEdges.map((edge) => {
                    const sourceNode = nodeMap.get(edge.source);
                    const targetNode = nodeMap.get(edge.target);
                    const sourceLabel = sourceNode?.label || edge.sourceLabel || edge.source;
                    const targetLabel = targetNode?.label || edge.targetLabel || edge.target;

                    return (
                      <div
                        key={edge.id}
                        className="w-full p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Source → Target */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono text-zinc-500 mb-0.5">De</div>
                              <div className="text-sm font-medium truncate" title={sourceLabel}>
                                {sourceLabel}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 px-2">
                              <span className="text-zinc-400">→</span>
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <div className="text-xs font-mono text-zinc-500 mb-0.5 text-right">Para</div>
                              <div className="text-sm font-medium truncate" title={targetLabel}>
                                {targetLabel}
                              </div>
                            </div>
                          </div>

                          {/* Relation type and weight */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">
                                {getRelationLabel(edge.tipoRelacao)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">peso: {edge.peso.toFixed(1)}</span>
                              <div className="flex gap-1">
                                <Button size="icon-sm" variant="ghost" onClick={() => startEdit(edge)}>
                                  <PencilIcon className="size-3.5" />
                                </Button>
                                <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(edge.id)} disabled={loading}>
                                  <Trash2Icon className="size-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {(mode === "add" || mode === "edit") && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Nó de origem</Label>
                  <Select
                    value={formData.sourceNodeId}
                    onValueChange={(value) =>
                      setFormData((f) => ({ ...f, sourceNodeId: value ?? "", targetNodeId: "", tipoRelacao: "" }))
                    }
                    disabled={mode === "edit"}
                  >
                    <SelectTrigger id="source" className="w-full">
                      <SelectValue placeholder="Selecione o nó de origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          <div className="flex items-center gap-2 py-1 min-w-0">
                            <span className="text-xs text-zinc-500 capitalize w-16 flex-shrink-0">{node.type.toLowerCase()}</span>
                            <span className="truncate">{node.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Nó de destino</Label>
                  <Select
                    value={formData.targetNodeId}
                    onValueChange={(value) =>
                      setFormData((f) => ({ ...f, targetNodeId: value ?? "", tipoRelacao: "" }))
                    }
                    disabled={mode === "edit"}
                  >
                    <SelectTrigger id="target" className="w-full">
                      <SelectValue placeholder="Selecione o nó de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.sourceNodeId ? (
                        getAvailableTargets(formData.sourceNodeId, selectedEdge?.id).length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhum destino disponível
                          </SelectItem>
                        ) : (
                          getAvailableTargets(formData.sourceNodeId, selectedEdge?.id).map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                              <div className="flex items-center gap-2 py-1">
                                <span className="text-xs text-zinc-500 capitalize w-16 flex-shrink-0">{node.type.toLowerCase()}</span>
                                <span className="truncate">{node.label}</span>
                              </div>
                            </SelectItem>
                          ))
                        )
                      ) : (
                        <SelectItem value="none" disabled>
                          Selecione a origem primeiro
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relation-type">Tipo de relação</Label>
                <Select
                  value={formData.tipoRelacao}
                  onValueChange={(value) => setFormData((f) => ({ ...f, tipoRelacao: value ?? "" }))}
                >
                  <SelectTrigger id="relation-type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {!sourceType || !targetType ? (
                      <SelectItem value="none" disabled>
                        Selecione origem e destino primeiro
                      </SelectItem>
                    ) : allowedRelations.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Estes tipos de nó não podem ser relacionados
                      </SelectItem>
                    ) : (
                      allowedRelations.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {RELATION_LABELS[rel] ?? rel}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {sourceType && targetType && allowedRelations.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    Relações permitidas para {sourceType.toLowerCase()} ↔ {targetType.toLowerCase()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso">Peso da relação (0.0 - 2.0)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.peso}
                  onChange={(e) => setFormData((f) => ({ ...f, peso: parseFloat(e.target.value) || 1.0 }))}
                  className="w-full"
                />
                <p className="text-xs text-zinc-500">
                  Peso influencia a força da atração na força no layout do grafo. Valores mais altos aproximam mais os nós.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {mode === "list" ? "Fechar" : "Cancelar"}
          </Button>
          {mode === "list" ? (
            <Button onClick={startAdd}>
              <PlusIcon className="size-4" />
              Adicionar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={resetForm}>Limpar</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : mode === "add" ? (
                  "Criar"
                ) : (
                  "Salvar"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
