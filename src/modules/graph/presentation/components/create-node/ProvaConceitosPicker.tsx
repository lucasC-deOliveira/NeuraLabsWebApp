import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import type { ConceitoPickerEntry } from "@/modules/graph/domain/services/prova-conceitos";

// Multi-select of the concepts a question tests: existing graph nodes and new
// ones the AI proposed come pre-selected (toggle to drop), and the user can add
// their own. Confirmed here, the links are written into the graph on save.

const CHIP = "rounded-full border px-2 py-0.5 text-[11px] transition-colors";
const CHIP_ON = "border-primary bg-primary/10 text-primary";
const CHIP_OFF = "border-zinc-200 dark:border-zinc-700 text-muted-foreground line-through";

interface ProvaConceitosPickerProps {
  entries: ConceitoPickerEntry[];
  loading: boolean;
  onToggle: (nome: string) => void;
  onAdd: (nome: string) => void;
}

export function ProvaConceitosPicker({ entries, loading, onToggle, onAdd }: ProvaConceitosPickerProps) {
  const [novo, setNovo] = useState("");
  const submitNovo = (): void => {
    onAdd(novo);
    setNovo("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Conceitos</span>
        {loading && <Loader2Icon className="size-3 animate-spin text-muted-foreground" />}
      </div>
      {entries.length === 0 && !loading ? (
        <p className="text-[10px] text-muted-foreground">Nenhum conceito sugerido — adicione abaixo.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {entries.map((e) => (
            <button
              key={e.nome}
              type="button"
              onClick={() => onToggle(e.nome)}
              className={`${CHIP} ${e.selected ? CHIP_ON : CHIP_OFF}`}
              title={e.conceitoId ? "Conceito existente no grafo" : "Novo conceito"}
            >
              {e.nome}
              {e.conceitoId === null && e.selected && <span className="ml-1 opacity-60">novo</span>}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={novo}
          onChange={(ev) => setNovo(ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && (ev.preventDefault(), submitNovo())}
          placeholder="Adicionar conceito..."
          className="min-w-0 flex-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-0.5 text-[11px]"
        />
        <button
          type="button"
          onClick={submitNovo}
          className="rounded border border-zinc-200 dark:border-zinc-700 px-1.5 hover:border-primary/40"
          aria-label="Adicionar conceito"
        >
          <PlusIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
