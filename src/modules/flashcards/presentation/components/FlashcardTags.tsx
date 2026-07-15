"use client";

import { TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FlashcardConceptTag } from "../../domain/flashcard.types";
import type { FlashcardCriteria } from "../../domain/services/flashcard-filters";

interface FlashcardTagsProps {
  tags: FlashcardConceptTag[];
  // Clicar numa tag filtra a lista por ela; a página decide como aplicar o patch.
  onFilter: (patch: Partial<FlashcardCriteria>) => void;
}

const ASSUNTO_CHIP = "text-[10px] h-5 px-1.5 font-normal text-muted-foreground";
const TOPICO_CHIP = "text-[10px] h-5 px-1.5 font-normal";
const CONCEITO_CHIP = "text-[10px] h-5 px-1.5 font-medium";

interface Chip {
  nome: string;
}

// Os pais se repetem entre os conceitos conectados; mostramos cada nome uma vez.
function distinctChips<T extends Chip>(chips: T[]): T[] {
  const out = new Map<string, T>();
  for (const c of chips) if (c.nome && !out.has(c.nome)) out.set(c.nome, c);
  return [...out.values()];
}

interface FilterChipProps {
  nome: string;
  variant: "outline" | "secondary";
  className: string;
  onClick?: () => void;
}

// Sem id (conceito órfão de pai) a tag não tem por onde filtrar: vira rótulo puro.
// stopPropagation: o card inteiro é clicável e abriria o detalhe.
function FilterChip({ nome, variant, className, onClick }: FilterChipProps) {
  if (!onClick) return <Badge variant={variant} className={className}>{nome}</Badge>;
  return (
    <button
      type="button"
      title={`Filtrar por ${nome}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Badge variant={variant} className={`${className} cursor-pointer hover:ring-1 hover:ring-primary/40`}>
        {nome}
      </Badge>
    </button>
  );
}

// Tags do flashcard derivadas dos conceitos aos quais ele está conectado no grafo e
// dos pais desses conceitos. Mostra os três níveis distintos (deduplicados) do mais
// amplo ao mais específico: assunto → tópico → conceito.
export function FlashcardTags({ tags, onFilter }: FlashcardTagsProps) {
  const assuntos = distinctChips(tags.map((t) => ({ nome: t.assunto, id: t.assuntoId })));
  const topicos = distinctChips(tags.map((t) => ({ nome: t.topico, id: t.topicoId, assuntoId: t.assuntoId })));
  const conceitos = distinctChips(tags.map((t) => ({ nome: t.conceito })));
  if (conceitos.length === 0 && assuntos.length === 0 && topicos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <TagIcon className="size-3 text-muted-foreground shrink-0" />
      {assuntos.map((a) => (
        <FilterChip
          key={`a-${a.nome}`}
          nome={a.nome}
          variant="outline"
          className={ASSUNTO_CHIP}
          onClick={a.id ? () => onFilter({ assuntoFilter: a.id, topicoFilter: "" }) : undefined}
        />
      ))}
      {topicos.map((t) => (
        <FilterChip
          key={`t-${t.nome}`}
          nome={t.nome}
          variant="outline"
          className={TOPICO_CHIP}
          onClick={t.id && t.assuntoId ? () => onFilter({ assuntoFilter: t.assuntoId, topicoFilter: t.id }) : undefined}
        />
      ))}
      {conceitos.map((c) => (
        <FilterChip
          key={`c-${c.nome}`}
          nome={c.nome}
          variant="secondary"
          className={CONCEITO_CHIP}
          onClick={() => onFilter({ search: c.nome })}
        />
      ))}
    </div>
  );
}
