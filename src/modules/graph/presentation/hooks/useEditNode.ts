import { useEffect, useState } from "react";
import { toast } from "sonner";
import { graphHttp } from "../../infra/http";
import { updateNode, NodeValidationError } from "../../application/use-cases/update-node";
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
  setField: (key: string, value: string) => void;
  save: () => Promise<void>;
}

const toFields = (details: Record<string, string | null>): NodeEditFields =>
  Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v ?? ""]));

export function useEditNode(args: UseEditNodeArgs): UseEditNode {
  const { loading, fields, setField } = useNodeDetails(args);
  const { saving, save } = useSaveNode(args, fields);
  return { loading, saving, fields, setField, save };
}

// Loads the node details into form state when the modal opens. `loading` is
// DERIVED (not a setState-in-effect) from whether the current node's details
// have settled, which keeps the effect free of cascading renders.
function useNodeDetails(args: UseEditNodeArgs): {
  loading: boolean;
  fields: NodeEditFields;
  setField: (key: string, value: string) => void;
} {
  const [fields, setFields] = useState<NodeEditFields>({});
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const nodeId = args.node?.id ?? null;
  const group = args.node?.group;

  useLoadNodeDetails(args, group, nodeId, setFields, setSettledFor);

  const loading = Boolean(args.open && nodeId && settledFor !== nodeId);
  const setField = (key: string, value: string): void =>
    setFields((f) => ({ ...f, [key]: value }));
  return { loading, fields, setField };
}

function useLoadNodeDetails(
  args: UseEditNodeArgs,
  group: string | undefined,
  nodeId: string | null,
  onFields: (f: NodeEditFields) => void,
  onSettled: (id: string) => void,
): void {
  const { open, onOpenChange } = args;
  useEffect(() => {
    if (!open || !nodeId || !group) return;
    let ignore = false;
    graphHttp
      .getNodeDetails(group, nodeId)
      .then((d): void => { if (!ignore) applyNodeDetails(d, onFields, onOpenChange); })
      .catch((): void => { if (!ignore) toast.error("Erro ao carregar dados do nó"); })
      .finally((): void => { if (!ignore) onSettled(nodeId); });
    return (): void => { ignore = true; };
  }, [open, group, nodeId, onOpenChange, onFields, onSettled]);
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
  fields: NodeEditFields,
): { saving: boolean; save: () => Promise<void> } {
  const [saving, setSaving] = useState(false);
  const save = (): Promise<void> => performSave(args, fields, setSaving);
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
    await updateNode(graphHttp, { grafoId, group: node.group, nodeId: node.id, fields });
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
