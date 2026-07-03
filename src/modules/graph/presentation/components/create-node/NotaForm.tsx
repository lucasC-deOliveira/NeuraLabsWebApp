import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { getAllowedRelations } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";

export interface NotaFieldValues {
  nome: string;
  tipoNota: string;
  subtipo: string;
  fonte: string;
  conteudo: string;
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

const TIPO_HINTS: Record<string, string> = {
  PERMANENTE:
    "Dica: uma única ideia principal por nota. Depois, conecte-a a conceitos pelo grafo (define, explica, aprofunda...).",
  ESTRUTURA: "Dica: use esta nota como índice — relacione-a aos tópicos e conceitos que ela organiza.",
};

interface NotaFieldsProps {
  form: NotaFieldValues;
  onField: (key: keyof NotaFieldValues, value: string) => void;
}

export function NotaFields({ form, onField }: NotaFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="nota-titulo">Título</Label>
        <Input
          id="nota-titulo"
          placeholder="Ex: SVM maximiza a margem entre classes"
          value={form.nome}
          onChange={(e) => onField("nome", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nota-tipo">Tipo de nota (Zettelkasten)</Label>
        <Select value={form.tipoNota} onValueChange={(value) => onField("tipoNota", value ?? "PERMANENTE")}>
          <SelectTrigger id="nota-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TipoNotaItem value="LITERATURA" title="Nota de referência (literatura)" desc="Anotações de leitura — próximas da fonte original" />
            <TipoNotaItem value="PERMANENTE" title="Nota permanente" desc="Uma ideia, suas palavras, compreensível isoladamente" />
            <TipoNotaItem value="ESTRUTURA" title="Nota de estrutura" desc="Índice ou mapa de conhecimento" />
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nota-subtipo">Subtipo</Label>
        <Select value={form.subtipo} onValueChange={(value) => onField("subtipo", value ?? "")}>
          <SelectTrigger id="nota-subtipo">
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

      {form.tipoNota === "LITERATURA" && (
        <div className="space-y-1.5">
          <Label htmlFor="nota-fonte">Fonte</Label>
          <Input
            id="nota-fonte"
            placeholder="Ex: Livro sobre Machine Learning, cap. 4"
            value={form.fonte}
            onChange={(e) => onField("fonte", e.target.value)}
          />
        </div>
      )}

      {TIPO_HINTS[form.tipoNota] && <p className="text-xs text-muted-foreground">{TIPO_HINTS[form.tipoNota]}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="texto-bruto">Texto da nota (suporta Markdown)</Label>
        <Textarea
          id="texto-bruto"
          placeholder="Digite ou cole sua nota aqui... (markdown: # título, **negrito**, - listas, tabelas)"
          value={form.conteudo}
          onChange={(e) => onField("conteudo", e.target.value)}
          rows={6}
        />
      </div>
    </>
  );
}

function TipoNotaItem({ value, title, desc }: { value: string; title: string; desc: string }) {
  return (
    <SelectItem value={value}>
      <div className="py-0.5">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </SelectItem>
  );
}

export interface NotaSuggestion {
  nodeId: string;
  nodeTipo: "ASSUNTO" | "TOPICO" | "CONCEITO";
  nodeNome: string;
  relacao: string;
  motivo: string;
  accepted: boolean;
}

interface NotaAiSuggestionsProps {
  loading: boolean;
  suggestions: NotaSuggestion[];
  onSuggest: () => void;
  onChange: (suggestions: NotaSuggestion[]) => void;
}

export function NotaAiSuggestions({ loading, suggestions, onSuggest, onChange }: NotaAiSuggestionsProps) {
  const update = (idx: number, patch: Partial<NotaSuggestion>): void =>
    onChange(suggestions.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={onSuggest} disabled={loading}>
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
        Sugerir relações com IA
      </Button>
      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-md border border-primary/40 p-2">
          <p className="text-xs font-semibold text-primary">
            Sugestões — desmarque as que não quiser; a relação é criada junto com a nota
          </p>
          {suggestions.map((sg, idx) => (
            <SuggestionRow key={sg.nodeId} suggestion={sg} idx={idx} onUpdate={update} />
          ))}
        </div>
      )}
    </>
  );
}

interface SuggestionRowProps {
  suggestion: NotaSuggestion;
  idx: number;
  onUpdate: (idx: number, patch: Partial<NotaSuggestion>) => void;
}

function SuggestionRow({ suggestion: sg, idx, onUpdate }: SuggestionRowProps) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={sg.accepted}
        onChange={(e) => onUpdate(idx, { accepted: e.target.checked })}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {sg.nodeTipo.toLowerCase()}
          </Badge>
          <span className="truncate font-medium">{sg.nodeNome}</span>
          <Select value={sg.relacao} onValueChange={(value) => onUpdate(idx, { relacao: value ?? sg.relacao })}>
            <SelectTrigger className="h-6 w-auto px-2 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAllowedRelations("NOTA", sg.nodeTipo).map((rel) => (
                <SelectItem key={rel} value={rel}>
                  {RELATION_LABELS[rel] ?? rel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sg.motivo && <p className="text-xs text-muted-foreground">{sg.motivo}</p>}
      </div>
    </div>
  );
}
