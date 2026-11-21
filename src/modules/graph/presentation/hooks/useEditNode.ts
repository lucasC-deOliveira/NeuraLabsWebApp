import { useEffect, useState } from "react";
import { toast } from "sonner";
import { graphHttp } from "../../infra/http";
import { updateNode, NodeValidationError } from "../../application/use-cases/update-node";
import type { GraphNodeEditorPort, NodeDetails } from "../../application/ports/graph-nodes.port";
import type { NodeEditError, NodeEditFields } from "../../domain/services/node-edit-validation";

export interface EditableNode {
  id: string;
  group: string;
  label: string;
}

// User-facing pt-BR messages for each domain validation code (the domain returns
// English codes; the UI translates here).
const VALIDATION_MESSAGES: Record<NodeEditError, string> = {
  "flashcard-missing-fields": "Pergunta e resposta são obrigatórias",
  "nota-missing-title": "O título da nota é obrigatório",
  "nota-missing-subtype": "Selecione o subtipo da nota",
  "nota-missing-source": "Notas de referência exigem a fonte",
  "nota-missing-content": "O texto da nota é obrigatório",
  "missing-name": "O nome é obrigatório",
};

interface UseEditNodeArgs {
  editor?: GraphNodeEditorPort;
  initialDetails?: NodeDetails;
  open: boolean;
  node: EditableNode | null;
  grafoId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface UseEditNode {
  loading: boolean;
  saving: boolean;
  fields: NodeEditFields;
  save: (draft: NodeEditFields) => Promise<void>;
}

const toFields = (details: Record<string, string | null>): NodeEditFields =>
  Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v ?? ""]));

const NODE_DETAILS_TIMEOUT_MS = 10_000;

export function useEditNode(args: UseEditNodeArgs): UseEditNode {
  const { loading, fields } = useNodeDetails(args);
  const { saving, save } = useSaveNode(args);
  return { loading, saving, fields, save };
}

// Loads the node details into form state when the modal opens. `loading` is
// DERIVED (not a setState-in-effect) from whether the current node's details
// have settled, which keeps the effect free of cascading renders.
function useNodeDetails(args: UseEditNodeArgs): {
  loading: boolean;
  fields: NodeEditFields;
} {
  const [fields, setFields] = useState<NodeEditFields>(() => args.initialDetails ? toFields(args.initialDetails) : {});
  const [settledFor, setSettledFor] = useState<string | null>(() => args.initialDetails ? args.node?.id ?? null : null);
  const nodeId = args.node?.id ?? null;
  const group = args.node?.group;

  useLoadNodeDetails(args, group, nodeId, setFields, setSettledFor);

  const loading = Boolean(args.open && nodeId && settledFor !== nodeId);
  return { loading, fields };
}

function useLoadNodeDetails(
  args: UseEditNodeArgs, group: string | undefined, nodeId: string | null,
  onFields: (f: NodeEditFields) => void, onSettled: (id: string) => void,
): void {
  const { open, onOpenChange, editor, initialDetails } = args;
  useEffect(() => {
    if (!open || !nodeId || initialDetails) return;
    if (!group) return applyNodeDetails(null, onFields, onOpenChange);
    const onError = (error: unknown): void => {
      toast.error(editor && error instanceof Error ? error.message : "Erro ao carregar dados do nó");
      onOpenChange(false);
    };
    return loadNodeDetails(editor ?? graphHttp, group, nodeId, (details): void => {
      applyNodeDetails(details, onFields, onOpenChange);
      onSettled(nodeId);
    }, onError);
  }, [open, group, nodeId, onOpenChange, onFields, onSettled, editor, initialDetails]);
}

function loadNodeDetails(
  editor: GraphNodeEditorPort, group: string, nodeId: string,
  onLoaded: (details: Awaited<ReturnType<GraphNodeEditorPort["getNodeDetails"]>>) => void,
  onError: (error: unknown) => void,
): () => void {
  const request = new AbortController();
  const timer = setTimeout(() => {
    request.abort();
    onError(new Error("Tempo esgotado ao carregar o nó. Abra a edição novamente."));
  }, NODE_DETAILS_TIMEOUT_MS);
  void Promise.resolve().then(() => editor.getNodeDetails(group, nodeId))
    .then((details): void => { if (!request.signal.aborted) onLoaded(details); })
    .catch((error: unknown): void => { if (!request.signal.aborted) onError(error); })
    .finally(() => clearTimeout(timer));
  return (): void => { request.abort(); clearTimeout(timer); };
}

function applyNodeDetails(
  details: Record<string, string | null> | null,
  onFields: (f: NodeEditFields) => void,
  onOpenChange: (open: boolean) => void,
): void {
  if (details) return onFields(toFields(details));
  toast.error("Nó não encontrado");
  onOpenChange(false);
}

function useSaveNode(
  args: UseEditNodeArgs,
): { saving: boolean; save: (draft: NodeEditFields) => Promise<void> } {
  const [saving, setSaving] = useState(false);
  const save = (draft: NodeEditFields): Promise<void> => performSave(args, draft, setSaving);
  return { saving, save };
}

async function performSave(
  args: UseEditNodeArgs,
  fields: NodeEditFields,
  setSaving: (v: boolean) => void,
): Promise<void> {
  const { node, grafoId, onOpenChange, onSuccess } = args;
  if (!node) return;
  setSaving(true);
  try {
    await updateNode(args.editor ?? graphHttp, { grafoId, group: node.group, nodeId: node.id, fields });
    toast.success("Nó atualizado!");
    onOpenChange(false);
    onSuccess?.();
  } catch (e) {
    toast.error(saveErrorMessage(e));
  } finally {
    setSaving(false);
  }
}

function saveErrorMessage(e: unknown): string {
  if (e instanceof NodeValidationError) return VALIDATION_MESSAGES[e.code];
  if (e instanceof Error) return e.message;
  return "Erro ao atualizar nó";
}
