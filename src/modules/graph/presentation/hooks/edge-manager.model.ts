// View-model types + pure helpers for the edge manager modal. Shared by
// useEdgeManager and useEdgeActions (kept in one module to avoid an import cycle).
import type { EdgeFormValues } from "../../domain/services/edge-form-validation";

export interface EdgeManagerEdge {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

export interface EdgeNode {
  id: string;
  label: string;
  type: string;
}

export type EdgeMode = "list" | "add" | "edit";

export interface EditorState {
  mode: EdgeMode;
  form: EdgeFormValues;
  selected: EdgeManagerEdge | null;
}

export interface EdgeManagerProps {
  open: boolean;
  grafoId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialSourceId?: string;
  initialTargetId?: string;
  initialEditEdge?: EdgeManagerEdge | null;
}

export const EMPTY_FORM: EdgeFormValues = {
  sourceNodeId: "",
  targetNodeId: "",
  tipoRelacao: "",
  peso: 1.0,
};

export const LIST_STATE: EditorState = { mode: "list", form: EMPTY_FORM, selected: null };

/** Editor state when starting to edit an existing edge. */
export function editorForEdit(edge: EdgeManagerEdge): EditorState {
  return {
    mode: "edit",
    selected: edge,
    form: { sourceNodeId: edge.source, targetNodeId: edge.target, tipoRelacao: edge.tipoRelacao, peso: edge.peso },
  };
}

/** Initial editor state derived from the modal's opening props. */
export function initialEditorState(props: EdgeManagerProps): EditorState {
  if (props.initialEditEdge) return editorForEdit(props.initialEditEdge);
  if (props.initialSourceId) {
    return {
      mode: "add",
      selected: null,
      form: { ...EMPTY_FORM, sourceNodeId: props.initialSourceId, targetNodeId: props.initialTargetId ?? "" },
    };
  }
  return LIST_STATE;
}
