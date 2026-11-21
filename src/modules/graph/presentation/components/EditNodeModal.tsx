import { useCallback, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2Icon, XIcon } from "lucide-react";
import { useEditNode, type EditableNode } from "../hooks/useEditNode";
import type { NodeEditFields } from "../../domain/services/node-edit-validation";
import type { GraphNodeEditorPort, LoadConceptEditImpact, NodeDetails } from "../../application/ports/graph-nodes.port";
import { useConceptEditImpact } from "../hooks/useConceptEditImpact";
import { ConceptEditImpact } from "./ConceptEditImpact";

interface EditNodeModalProps {
  loadImpact?: LoadConceptEditImpact;
  readDraft?: () => NodeEditFields;
  focusedFieldRef?: RefObject<NodeEditFocus | null>;
  onDraftFieldChange?: (name: string, value: string) => void;
  editor?: GraphNodeEditorPort;
  initialDetails?: NodeDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  node: EditableNode | null;
  onSuccess?: () => void;
}

export interface NodeEditFocus {
  name: string;
  start: number | null;
  end: number | null;
  direction: HTMLInputElement["selectionDirection"];
}

function isTextField(element: EventTarget | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function readEditFocus(field: EventTarget | null): NodeEditFocus | null {
  if (isTextField(field)) {
    return { name: field.name, start: field.selectionStart, end: field.selectionEnd, direction: field.selectionDirection };
  }
  return field instanceof HTMLSelectElement ? { name: field.name, start: null, end: null, direction: null } : null;
}

function restoreEditFocus(form: HTMLFormElement | null, focus: NodeEditFocus): void {
  const field = form?.elements.namedItem(focus.name);
  if (!(field instanceof HTMLElement)) return;
  field.focus({ preventScroll: true });
  if (isTextField(field) && focus.start !== null && focus.end !== null) {
    field.setSelectionRange(focus.start, focus.end, focus.direction ?? undefined);
  }
}

interface FieldsProps {
  fields: NodeEditFields;
}

const fieldClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring";

const SUBTIPOS: Array<[string, string]> = [
  ["DEFINICAO", "Definição"],
  ["EXPLICACAO", "Explicação"],
  ["EXEMPLO", "Exemplo"],
  ["COMPARACAO", "Comparação"],
  ["SINTESE", "Síntese"],
  ["PREREQUISITO", "Pré-requisito"],
  ["ERRO_COMUM", "Erro comum"],
  ["APLICACAO", "Aplicação"],
];

function StructuralFields({ fields }: FieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-nome">Nome</Label>
        <input className={fieldClass} id="edit-nome" name="nome" defaultValue={fields.nome ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-descricao">Descrição (opcional)</Label>
        <Textarea
          id="edit-descricao"
          name="descricao"
          rows={3}
          defaultValue={fields.descricao ?? ""}
        />
      </div>
    </>
  );
}

function FlashcardFields({ fields }: FieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-pergunta">Pergunta</Label>
        <Textarea
          id="edit-pergunta"
          name="pergunta"
          rows={3}
          defaultValue={fields.pergunta ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-resposta">Resposta</Label>
        <Textarea
          id="edit-resposta"
          name="resposta"
          rows={3}
          defaultValue={fields.resposta ?? ""}
        />
      </div>
    </>
  );
}

function NotaFields({ fields }: FieldsProps) {
  const [noteType, setNoteType] = useState(fields.tipoNota || "PERMANENTE");
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-titulo">Título</Label>
        <input className={fieldClass} id="edit-titulo" name="titulo" defaultValue={fields.titulo ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-tipo-nota">Tipo de nota (Zettelkasten)</Label>
        <select
          className={fieldClass}
          id="edit-tipo-nota"
          name="tipoNota"
          defaultValue={fields.tipoNota || "PERMANENTE"}
          onChange={(event) => setNoteType(event.currentTarget.value)}
        >
          <option value="LITERATURA">Nota de referência (literatura)</option>
          <option value="PERMANENTE">Nota permanente</option>
          <option value="ESTRUTURA">Nota de estrutura</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-subtipo">Subtipo</Label>
        <select className={fieldClass} id="edit-subtipo" name="subtipo" defaultValue={fields.subtipo || ""}>
          <option value="">Selecione o subtipo</option>
          {SUBTIPOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5" hidden={noteType !== "LITERATURA"}>
        <Label htmlFor="edit-fonte">Fonte</Label>
        <input
          className={fieldClass}
          id="edit-fonte"
          name="fonte"
          placeholder="Ex: Livro sobre Machine Learning, cap. 4"
          defaultValue={fields.fonte ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-texto">Texto da nota (suporta Markdown)</Label>
        <Textarea
          id="edit-texto"
          name="conteudo"
          rows={6}
          defaultValue={fields.conteudo ?? ""}
        />
      </div>
    </>
  );
}

function NodeFields({ group, fields, readDraft }: FieldsProps & Pick<EditNodeModalProps, "readDraft"> & { group?: string }) {
  // Rewriting textarea.defaultValue during editing can move the selection in Chromium.
  const [initialFields] = useState(() => ({ ...fields, ...readDraft?.() }));
  if (group === "FLASHCARD") return <FlashcardFields fields={initialFields} />;
  if (group === "NOTA") return <NotaFields fields={initialFields} />;
  return <StructuralFields fields={initialFields} />;
}

export function EditNodeModal({
  open, onOpenChange, grafoId, node, onSuccess, editor, initialDetails, readDraft, onDraftFieldChange, focusedFieldRef, loadImpact,
}: EditNodeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const impact = useConceptEditImpact(open ? loadImpact : undefined);
  const impactPending = impact === "loading" || (impact !== null && "failed" in impact);
  const closeEditor = useCallback(() => {
    // The graph removes this editor after closing. Release the native backdrop first.
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onOpenChange(false);
  }, [onOpenChange]);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open === open) return;
    if (!open) {
      dialog.close();
      return;
    }
    // showModal can focus the first input before we restore the session's active field.
    const focus = focusedFieldRef?.current;
    dialog.showModal();
    if (!focusedFieldRef || !focus) return;
    restoreEditFocus(formRef.current, focus);
    focusedFieldRef.current = focus;
  }, [open, focusedFieldRef]);
  const { loading, saving, fields, save } = useEditNode({
    open,
    editor,
    initialDetails,
    node,
    grafoId,
    onOpenChange: closeEditor,
    onSuccess,
  });
  const rememberFocus = (target: EventTarget | null) => {
    const focus = readEditFocus(target);
    if (focusedFieldRef && focus) focusedFieldRef.current = focus;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100%-2rem)] overflow-auto rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 backdrop:bg-black/50"
      onCancel={(event) => { event.preventDefault(); closeEditor(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeEditor(); }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <form
        ref={formRef}
        className="relative grid gap-4 p-4"
        onReset={(event) => event.preventDefault()}
        onFocusCapture={(event) => rememberFocus(event.target)}
        onSelectCapture={(event) => rememberFocus(event.target)}
        onInputCapture={(event) => {
          const field = event.target;
          rememberFocus(field);
          if (isTextField(field) || field instanceof HTMLSelectElement) {
            onDraftFieldChange?.(field.name, field.value);
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (loading || saving || impactPending) return;
          const entries = new FormData(event.currentTarget).entries();
          void save(Object.fromEntries(Array.from(entries, ([name, value]) => [name, String(value)])));
        }}
      >
        <header className="space-y-1 pr-9">
          <h2 id={headingId} className="text-base font-semibold">Editar nó</h2>
          <p id={descriptionId} className="text-muted-foreground">
            Altere os dados de “{node?.label}”. {editor
              ? "As mudanças são salvas nos grafos do vault que usam este nó."
              : "As mudanças valem para todos os grafos que usam este nó."}
          </p>
        </header>
        <ConceptEditImpact impact={impact} currentGraphId={grafoId} local={Boolean(editor)} />

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <NodeFields group={node?.group} fields={fields} readDraft={readDraft} />
          </div>
        )}

        <footer className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeEditor}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || loading || impactPending}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </footer>
        <Button type="button" className="absolute top-2 right-2" variant="ghost" size="icon" onClick={closeEditor} aria-label="Fechar">
          <XIcon />
        </Button>
      </form>
    </dialog>
  );
}
