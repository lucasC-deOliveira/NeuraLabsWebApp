import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { graphHttp } from "../../infra/http";
import { getAllowedRelations } from "../../domain/services/relation-rules";
import type { EdgeFormValues } from "../../domain/services/edge-form-validation";
import { useEdgeActions, type EdgeActions } from "./useEdgeActions";
import {
  LIST_STATE,
  initialEditorState,
  type EdgeManagerEdge,
  type EdgeManagerProps,
  type EdgeMode,
  type EdgeNode,
} from "./edge-manager.model";

export type { EdgeManagerEdge, EdgeNode } from "./edge-manager.model";

export interface UseEdgeManager extends EdgeActions {
  mode: EdgeMode;
  form: EdgeFormValues;
  selected: EdgeManagerEdge | null;
  nodes: EdgeNode[];
  nodeMap: Map<string, EdgeNode>;
  allowedRelations: string[];
  loading: boolean;
}

export function useEdgeManager(props: EdgeManagerProps): UseEdgeManager {
  const [editor, setEditor] = useState(LIST_STATE);
  const [nodes, setNodes] = useState<EdgeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset editor state from props on each open transition (during render — not a
  // setState-in-effect — which React supports for prop-derived resets).
  if (props.open !== prevOpen) {
    setPrevOpen(props.open);
    if (props.open) setEditor(initialEditorState(props));
  }

  useFetchNodes(props.open, props.grafoId, setNodes);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const allowedRelations = relationsForForm(editor.form, nodeMap);
  const actions = useEdgeActions(props, editor, setEditor, setLoading);

  return { ...editor, nodes, nodeMap, allowedRelations, loading, ...actions };
}

function relationsForForm(form: EdgeFormValues, nodeMap: Map<string, EdgeNode>): string[] {
  const sourceType = nodeMap.get(form.sourceNodeId)?.type;
  const targetType = nodeMap.get(form.targetNodeId)?.type;
  return sourceType && targetType ? getAllowedRelations(sourceType, targetType) : [];
}

function useFetchNodes(
  open: boolean,
  grafoId: string,
  setNodes: (nodes: EdgeNode[]) => void,
): void {
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .getGraphNodes(grafoId)
      .then((r): void => { if (!ignore) setNodes(toEdgeNodes(r.nodes)); })
      .catch((): void => { if (!ignore) toast.error("Erro ao carregar nós do grafo"); });
    return (): void => { ignore = true; };
  }, [open, grafoId, setNodes]);
}

function toEdgeNodes(nodes: Array<{ id: string; label: string; type: string }>): EdgeNode[] {
  return nodes.map((n) => ({ id: n.id, label: n.label, type: n.type }));
}
