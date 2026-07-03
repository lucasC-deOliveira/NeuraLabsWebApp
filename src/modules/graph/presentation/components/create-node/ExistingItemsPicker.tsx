import { SearchIcon } from "lucide-react";
import type { AvailableItem } from "@/modules/graph/application/ports/graph-data.port";

interface ExistingItemsPickerProps {
  type: "FLASHCARD" | "NOTA";
  searchQuery: string;
  onSearch: (query: string) => void;
  flashcards: AvailableItem[];
  filteredFlashcards: AvailableItem[];
  notas: AvailableItem[];
  selectedItems: Set<string>;
  onToggle: (id: string) => void;
}

export function ExistingItemsPicker(props: ExistingItemsPickerProps) {
  const placeholder =
    props.type === "NOTA" ? "Buscar notas..." : "Buscar flashcards (pergunta, conceito, tópico...)";
  return (
    <>
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={props.searchQuery}
          onChange={(e) => props.onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
        />
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {props.type === "FLASHCARD" && <FlashcardList {...props} />}
        {props.type === "NOTA" && <NotaList {...props} />}
      </div>
    </>
  );
}

function FlashcardList({ flashcards, filteredFlashcards, selectedItems, onToggle }: ExistingItemsPickerProps) {
  if (flashcards.length === 0) return <EmptyItems message="Nenhum flashcard disponível" />;
  if (filteredFlashcards.length === 0) return <EmptyItems message="Nenhum flashcard corresponde à busca" />;
  return (
    <div className="space-y-1">
      {filteredFlashcards.map((item) => (
        <ItemRow key={item.id} item={item} selected={selectedItems.has(item.id)} onToggle={onToggle} />
      ))}
    </div>
  );
}

function NotaList({ notas, searchQuery, selectedItems, onToggle }: ExistingItemsPickerProps) {
  if (notas.length === 0) return <EmptyItems message="Nenhuma nota disponível" />;
  const q = searchQuery.toLowerCase();
  const visible = notas.filter(
    (n) => searchQuery === "" || n.label.toLowerCase().includes(q) || n.fullText.toLowerCase().includes(q),
  );
  return (
    <div className="space-y-1">
      {visible.map((item) => (
        <ItemRow key={item.id} item={item} selected={selectedItems.has(item.id)} onToggle={onToggle} />
      ))}
    </div>
  );
}

function EmptyItems({ message }: { message: string }) {
  return <p className="text-center text-zinc-500 py-8">{message}</p>;
}

function ItemRow({ item, selected, onToggle }: { item: AvailableItem; selected: boolean; onToggle: (id: string) => void }) {
  const cls = selected ? "bg-primary/10 border-primary" : "hover:bg-zinc-50 dark:hover:bg-zinc-800";
  return (
    <div
      className={`flex items-start gap-2 p-2 border rounded cursor-pointer transition-colors ${cls}`}
      onClick={() => onToggle(item.id)}
    >
      <input type="checkbox" checked={selected} onChange={() => {}} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.label}</div>
        <div className="text-xs text-zinc-500 truncate">{item.hierarquia}</div>
      </div>
    </div>
  );
}
