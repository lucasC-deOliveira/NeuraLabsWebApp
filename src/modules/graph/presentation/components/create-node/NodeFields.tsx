import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TypeOption {
  value: string;
  label: string;
  hint: string;
  bg: string;
  border: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "ASSUNTO", label: "Assunto", hint: "Área de estudo", bg: "#eef2ff", border: "#4338ca" },
  { value: "TOPICO", label: "Tópico", hint: "Subdivisão", bg: "#e0f2fe", border: "#0369a1" },
  { value: "CONCEITO", label: "Conceito", hint: "Unidade atômica", bg: "#d1fae5", border: "#059669" },
  { value: "FLASHCARD", label: "Flashcard", hint: "Cartão de estudo", bg: "#fef9c3", border: "#eab308" },
  { value: "NOTA", label: "Nota", hint: "Zettelkasten", bg: "#fdf4ff", border: "#9333ea" },
  { value: "BARALHO", label: "Baralho", hint: "Deck de cards", bg: "#fff7ed", border: "#ea580c" },
  { value: "PROVA", label: "Prova", hint: "Questões", bg: "#fffbeb", border: "#d97706" },
  { value: "EDITAL", label: "Edital", hint: "Completa o grafo", bg: "#ccfbf1", border: "#0d9488" },
];

// A visual grid of node-type cards (all options visible at once) instead of a
// plain dropdown — the type is the first choice, so it should be obvious.
export function NodeTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Tipo de nó</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TYPE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-accent/50"
              }`}
            >
              <span
                className="size-3.5 shrink-0 rounded-full border"
                style={{ backgroundColor: opt.bg, borderColor: opt.border }}
              />
              <span className={`whitespace-nowrap text-sm ${selected ? "font-medium" : ""}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>
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
