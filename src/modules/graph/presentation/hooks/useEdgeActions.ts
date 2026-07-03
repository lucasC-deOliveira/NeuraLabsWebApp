import { toast } from "sonner";
import { useRouter } from "@/lib/navigation";
import { graphHttp } from "../../infra/http";
import {
  createGraphEdge,
  updateGraphEdge,
  deleteGraphEdge,
  EdgeValidationError,
} from "../../application/use-cases/manage-graph-edges";
import type { EdgeFormError, EdgeFormValues } from "../../domain/services/edge-form-validation";
import {
  EMPTY_FORM,
  LIST_STATE,
  editorForEdit,
  type EditorState,
  type EdgeManagerEdge,
  type EdgeManagerProps,
} from "./edge-manager.model";

// Domain error CODE → user-facing pt-BR message.
const EDGE_ERROR_MESSAGES: Record<EdgeFormError, string> = {
  "edge-missing-fields": "Preencha todos os campos obrigatórios",
  "edge-same-node": "Origem e destino não podem ser o mesmo nó",
  "edge-incomplete": "Dados incompletos",
};

export interface EdgeActions {
  setForm: (patch: Partial<EdgeFormValues>) => void;
  startAdd: () => void;
  startEdit: (edge: EdgeManagerEdge) => void;
  reset: () => void;
  submit: () => Promise<void>;
  remove: (edgeId: string) => Promise<void>;
  handleOpenChange: (open: boolean) => void;
}

interface Router {
  refresh: () => void;
}
interface EdgeActionCtx {
  props: EdgeManagerProps;
  editor: EditorState;
  setEditor: (s: EditorState) => void;
  setLoading: (v: boolean) => void;
  router: Router;
}

export function useEdgeActions(
  props: EdgeManagerProps,
  editor: EditorState,
  setEditor: (s: EditorState) => void,
  setLoading: (v: boolean) => void,
): EdgeActions {
  const router = useRouter();
  const ctx: EdgeActionCtx = { props, editor, setEditor, setLoading, router };
  return {
    setForm: (patch) => setEditor({ ...editor, form: { ...editor.form, ...patch } }),
    startAdd: () => setEditor({ mode: "add", form: EMPTY_FORM, selected: null }),
    startEdit: (edge) => setEditor(editorForEdit(edge)),
    reset: () => setEditor(LIST_STATE),
    submit: () => performEdgeSubmit(ctx),
    remove: (edgeId) => performEdgeDelete(ctx, edgeId),
    handleOpenChange: (open) => closeEditor(ctx, open),
  };
}

function closeEditor(ctx: EdgeActionCtx, open: boolean): void {
  if (!open) ctx.setEditor(LIST_STATE);
  ctx.props.onOpenChange(open);
}

function edgeErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof EdgeValidationError) return EDGE_ERROR_MESSAGES[e.code];
  if (e instanceof Error) return e.message;
  return fallback;
}

function finishMutation(ctx: EdgeActionCtx, resetEditor: boolean): void {
  if (resetEditor) ctx.setEditor(LIST_STATE);
  ctx.props.onSuccess?.();
  ctx.router.refresh();
}

async function performEdgeSubmit(ctx: EdgeActionCtx): Promise<void> {
  const { props, editor, setLoading } = ctx;
  const isAdd = editor.mode === "add";
  setLoading(true);
  try {
    if (isAdd) await createGraphEdge(graphHttp, props.grafoId, editor.form);
    else await updateGraphEdge(graphHttp, editor.selected?.id ?? null, props.grafoId, editor.form);
    toast.success(isAdd ? "Relação criada com sucesso!" : "Relação atualizada com sucesso!");
    finishMutation(ctx, true);
  } catch (e) {
    toast.error(edgeErrorMessage(e, "Erro ao salvar relação"));
  } finally {
    setLoading(false);
  }
}

async function performEdgeDelete(ctx: EdgeActionCtx, edgeId: string): Promise<void> {
  if (!window.confirm("Tem certeza que deseja remover esta relação?")) return;
  ctx.setLoading(true);
  try {
    await deleteGraphEdge(graphHttp, edgeId, ctx.props.grafoId);
    toast.success("Relação removida com sucesso!");
    finishMutation(ctx, false);
  } catch (e) {
    toast.error(edgeErrorMessage(e, "Erro ao remover relação"));
  } finally {
    ctx.setLoading(false);
  }
}
