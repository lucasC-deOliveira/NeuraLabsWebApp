"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SearchIcon, ChevronLeftIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import type { FlashcardPreview, FlashcardSourceType } from "../../../domain/flashcard-source.types";
import { SOURCE_CONFIG } from "../../constants/source-config";

type AnalysisMode = "content" | "ia";

function groupBySource(cards: FlashcardPreview[]): Array<[FlashcardSourceType, FlashcardPreview[]]> {
  const map = new Map<FlashcardSourceType, FlashcardPreview[]>();
  for (const card of cards) {
    const group = map.get(card.source) ?? [];
    group.push(card);
    map.set(card.source, group);
  }
  return Array.from(map.entries());
}

interface PreviewListProps {
  selectedNotaName: string;
  selectedNotaDate: Date | null;
  analysisMode: AnalysisMode;
  previewCards: FlashcardPreview[];
  selectedCards: Set<string>;
  searchPreview: string;
  saving: boolean;
  onBack: () => void;
  onSearch: (v: string) => void;
  onToggleCard: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleGroup: (cardIds: string[], allSelected: boolean) => void;
  onSave: () => void;
}

function PreviewCard({ fc, source, selected, onToggle }: {
  fc: FlashcardPreview; source: FlashcardSourceType; selected: boolean; onToggle: () => void;
}) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.conteudo;
  return (
    <Card className={`transition-all border-zinc-200 dark:border-zinc-800 ${selected ? "border-primary/20 bg-primary/[0.015]" : "opacity-40 hover:opacity-70"}`}>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <CardContent className="pt-3 px-3 sm:px-5">
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 size-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
              {selected && <CheckCircle2Icon className="size-3 text-primary-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{fc.pergunta}</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-line line-clamp-3">{fc.resposta}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {fc.conceptNome && <Badge variant="outline" className="text-[10px] px-1.5 h-5">{fc.conceptNome}</Badge>}
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{cfg.icon} {cfg.label}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

function PreviewGroup({ source, cards, selectedCards, onToggleCard }: {
  source: FlashcardSourceType; cards: FlashcardPreview[]; selectedCards: Set<string>; onToggleCard: (id: string) => void;
}) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.conteudo;
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>{cfg.icon}</span>
        {cfg.label}
        <span className="text-[10px] font-normal text-zinc-500">— {cfg.description}</span>
        <span className="ml-auto text-zinc-400 font-normal">{cards.length}</span>
      </h3>
      <div className="space-y-1.5">
        {cards.map((fc) => (
          <PreviewCard key={fc.id} fc={fc} source={source} selected={selectedCards.has(fc.id)} onToggle={() => onToggleCard(fc.id)} />
        ))}
      </div>
    </div>
  );
}

export function PreviewList(props: PreviewListProps) {
  const {
    selectedNotaName, selectedNotaDate, analysisMode, previewCards, selectedCards, searchPreview, saving,
    onBack, onSearch, onToggleCard, onSelectAll, onSelectNone, onToggleGroup, onSave,
  } = props;

  const filtered = useMemo(() => {
    if (!searchPreview) return previewCards;
    const l = searchPreview.toLowerCase();
    return previewCards.filter((c) => c.pergunta.toLowerCase().includes(l) || c.resposta.toLowerCase().includes(l));
  }, [searchPreview, previewCards]);

  const grouped = useMemo(() => groupBySource(filtered), [filtered]);
  const totalCount = previewCards.length;
  const filteredCount = filtered.length;
  const selectedCount = Array.from(selectedCards).filter((id) => previewCards.some((c) => c.id === id)).length;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{selectedNotaName}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {selectedNotaDate && `Criada em ${selectedNotaDate.toLocaleDateString("pt-BR")} · `}
              {totalCount} flashcard(s) gerado(s) · {analysisMode === "ia" ? "Análise IA" : "Conteúdo"}
            </p>
          </div>
          <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
            <ChevronLeftIcon className="size-3" />Trocar
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar nos flashcards..." className="pl-9 h-9" value={searchPreview} onChange={(e) => onSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={onSelectAll}>Todas ({totalCount})</Button>
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={onSelectNone}>Nenhuma</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {grouped.map(([source, cards]) => {
          const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.conteudo;
          const allSelected = cards.every((c) => selectedCards.has(c.id));
          return (
            <button
              key={source}
              type="button"
              onClick={() => onToggleGroup(cards.map((c) => c.id), allSelected)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${allSelected ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label} ({cards.length}/{filteredCount})</span>
            </button>
          );
        })}
      </div>

      {searchPreview && <p className="text-xs text-zinc-400">Mostrando {filteredCount} de {totalCount} flashcard(s)</p>}

      <div className="space-y-6">
        {grouped.map(([source, cards]) => (
          <PreviewGroup key={source} source={source} cards={cards} selectedCards={selectedCards} onToggleCard={onToggleCard} />
        ))}
      </div>

      {filteredCount === 0 && searchPreview && (
        <div className="text-center py-8 text-zinc-400">
          <SearchIcon className="size-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum resultado para &quot;{searchPreview}&quot;</p>
        </div>
      )}

      <Separator />

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">Trocar nota</Button>
        <Button onClick={onSave} disabled={saving || selectedCount === 0} size="lg" className="w-full sm:w-auto">
          {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (<><CheckCircle2Icon className="size-4 mr-1" /> Salvar {selectedCount} flashcard(s)</>)}
        </Button>
      </div>
    </div>
  );
}
