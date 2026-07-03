import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import { useEditNode, type EditableNode } from "../hooks/useEditNode";
import type { NodeEditFields } from "../../domain/services/node-edit-validation";

interface EditNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  node: EditableNode | null;
  onSuccess?: () => void;
}

interface FieldsProps {
  fields: NodeEditFields;
  setField: (key: string, value: string) => void;
}

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

function StructuralFields({ fields, setField }: FieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-nome">Nome</Label>
        <Input id="edit-nome" value={fields.nome ?? ""} onChange={(e) => setField("nome", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-descricao">Descrição (opcional)</Label>
        <Textarea
          id="edit-descricao"
          rows={3}
          value={fields.descricao ?? ""}
          onChange={(e) => setField("descricao", e.target.value)}
        />
      </div>
    </>
  );
}

function FlashcardFields({ fields, setField }: FieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-pergunta">Pergunta</Label>
        <Textarea
          id="edit-pergunta"
          rows={3}
          value={fields.pergunta ?? ""}
          onChange={(e) => setField("pergunta", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-resposta">Resposta</Label>
        <Textarea
          id="edit-resposta"
          rows={3}
          value={fields.resposta ?? ""}
          onChange={(e) => setField("resposta", e.target.value)}
        />
      </div>
    </>
  );
}

function NotaFields({ fields, setField }: FieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="edit-titulo">Título</Label>
        <Input id="edit-titulo" value={fields.titulo ?? ""} onChange={(e) => setField("titulo", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-tipo-nota">Tipo de nota (Zettelkasten)</Label>
        <Select
          value={fields.tipoNota || "PERMANENTE"}
          onValueChange={(value) => setField("tipoNota", value ?? "PERMANENTE")}
        >
          <SelectTrigger id="edit-tipo-nota">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LITERATURA">Nota de referência (literatura)</SelectItem>
            <SelectItem value="PERMANENTE">Nota permanente</SelectItem>
            <SelectItem value="ESTRUTURA">Nota de estrutura</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-subtipo">Subtipo</Label>
        <Select value={fields.subtipo || ""} onValueChange={(value) => setField("subtipo", value ?? "")}>
          <SelectTrigger id="edit-subtipo">
            <SelectValue placeholder="Selecione o subtipo" />
          </SelectTrigger>
          <SelectContent>
            {SUBTIPOS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {fields.tipoNota === "LITERATURA" && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-fonte">Fonte</Label>
          <Input
            id="edit-fonte"
            placeholder="Ex: Livro sobre Machine Learning, cap. 4"
            value={fields.fonte ?? ""}
            onChange={(e) => setField("fonte", e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="edit-texto">Texto da nota (suporta Markdown)</Label>
        <Textarea
          id="edit-texto"
          rows={6}
          value={fields.conteudo ?? ""}
          onChange={(e) => setField("conteudo", e.target.value)}
        />
      </div>
    </>
  );
}

function NodeFields({ group, fields, setField }: FieldsProps & { group?: string }) {
  if (group === "FLASHCARD") return <FlashcardFields fields={fields} setField={setField} />;
  if (group === "NOTA") return <NotaFields fields={fields} setField={setField} />;
  return <StructuralFields fields={fields} setField={setField} />;
}

export function EditNodeModal({ open, onOpenChange, grafoId, node, onSuccess }: EditNodeModalProps) {
  const { loading, saving, fields, setField, save } = useEditNode({
    open,
    node,
    grafoId,
    onOpenChange,
    onSuccess,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar nó</DialogTitle>
          <DialogDescription>
            Altere os dados de “{node?.label}”. As mudanças valem para todos os grafos que usam este nó.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <NodeFields group={node?.group} fields={fields} setField={setField} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
