import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { CreateNodeControl } from "./NodeFields";

export interface DeckFlashcard {
  id: string;
  pergunta: string;
  conceito: string | null;
}

interface DeckFormProps {
  control: CreateNodeControl;
  flashcards: DeckFlashcard[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
}

export function DeckForm(props: DeckFormProps) {
  return (
    <div className="space-y-3">
      <FormField
        control={props.control}
        name="nome"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Título do baralho</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Revisão de Redes" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Flashcards do baralho (opcional)</Label>
          <span className="text-xs text-muted-foreground">{props.selected.size} selecionado(s)</span>
        </div>
        <input
          type="text"
          placeholder="Buscar flashcards..."
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
          <DeckList {...props} />
        </div>
        <p className="text-xs text-muted-foreground">
          Um flashcard pode estar em vários baralhos. Você pode adicionar mais depois.
        </p>
      </div>
    </div>
  );
}

function DeckList({ flashcards, loading, selected, onToggle, search }: DeckFormProps) {
  if (loading) return <p className="py-6 text-center text-xs text-muted-foreground">Carregando...</p>;
  if (flashcards.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Nenhum flashcard no grafo. Adicione flashcards ao grafo primeiro — o baralho pode ser criado vazio.
      </p>
    );
  }
  const visible = flashcards.filter((fc) => search === "" || fc.pergunta.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      {visible.map((fc) => (
        <DeckRow key={fc.id} flashcard={fc} checked={selected.has(fc.id)} onToggle={onToggle} />
      ))}
    </>
  );
}

function DeckRow({ flashcard, checked, onToggle }: { flashcard: DeckFlashcard; checked: boolean; onToggle: (id: string) => void }) {
  const cls = checked
    ? "bg-primary/10 border border-primary"
    : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800";
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded p-2 text-sm transition-colors ${cls}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={() => onToggle(flashcard.id)} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{flashcard.pergunta}</div>
        {flashcard.conceito && <div className="truncate text-xs text-muted-foreground">{flashcard.conceito}</div>}
      </div>
    </label>
  );
}
