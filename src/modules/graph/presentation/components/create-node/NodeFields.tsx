import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TypeOption {
  value: string;
  label: string;
  bg: string;
  border: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "ASSUNTO", label: "Assunto", bg: "#eef2ff", border: "#4338ca" },
  { value: "TOPICO", label: "Tópico", bg: "#e0f2fe", border: "#0369a1" },
  { value: "CONCEITO", label: "Conceito", bg: "#d1fae5", border: "#059669" },
  { value: "FLASHCARD", label: "Flashcard", bg: "#fef9c3", border: "#eab308" },
  { value: "NOTA", label: "Nota", bg: "#fdf4ff", border: "#9333ea" },
  { value: "BARALHO", label: "Baralho", bg: "#fff7ed", border: "#ea580c" },
  { value: "PROVA", label: "Prova", bg: "#fffbeb", border: "#d97706" },
];

export function NodeTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="node-type">Tipo de nó</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger id="node-type">
          <SelectValue placeholder="Selecione o tipo" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border" style={{ backgroundColor: opt.bg, borderColor: opt.border }} />
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface NameDescriptionFieldsProps {
  idPrefix: string;
  nome: string;
  descricao: string;
  onNome: (value: string) => void;
  onDescricao: (value: string) => void;
  nomePlaceholder: string;
  descricaoPlaceholder: string;
}

export function NameDescriptionFields(props: NameDescriptionFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${props.idPrefix}-nome`}>Nome</Label>
        <Input
          id={`${props.idPrefix}-nome`}
          placeholder={props.nomePlaceholder}
          value={props.nome}
          onChange={(e) => props.onNome(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${props.idPrefix}-descricao`}>Descrição (opcional)</Label>
        <Textarea
          id={`${props.idPrefix}-descricao`}
          placeholder={props.descricaoPlaceholder}
          value={props.descricao}
          onChange={(e) => props.onDescricao(e.target.value)}
          rows={3}
        />
      </div>
    </>
  );
}

interface FlashcardFieldsProps {
  pergunta: string;
  resposta: string;
  onPergunta: (value: string) => void;
  onResposta: (value: string) => void;
}

export function FlashcardFields({ pergunta, resposta, onPergunta, onResposta }: FlashcardFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="pergunta">Pergunta</Label>
        <Textarea
          id="pergunta"
          placeholder="O que você quer memorizar?"
          value={pergunta}
          onChange={(e) => onPergunta(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="resposta">Resposta</Label>
        <Textarea
          id="resposta"
          placeholder="A resposta para a pergunta"
          value={resposta}
          onChange={(e) => onResposta(e.target.value)}
          rows={3}
        />
      </div>
    </>
  );
}
