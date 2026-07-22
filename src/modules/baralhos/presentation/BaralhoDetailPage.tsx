"use client";

import { PageContainer } from "@/components/page-container";
import { useMemo, useState } from "react";
import { useParams } from "@/lib/navigation";
import { paginate } from "@/lib/paginate";
import { Pagination } from "@/components/pagination";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header/PageHeader";
import {
  PlusIcon, PlayIcon, LayersIcon, NetworkIcon, CheckIcon, PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/loading-state";
import { baralhosHttp } from "../infra/http";
import { excludeCardsInDeck } from "../domain/services/filter-card-options";
import {
  cardTipoOptions,
  cardTagOptions,
  filterAndSortBaralhoCards,
  DEFAULT_CARD_CRITERIA,
  type BaralhoCardCriteria,
} from "../domain/services/baralho-card-filters";
import type { ConceptTagSelection } from "@/components/concept-tags";
import { useBaralhoDetail } from "./hooks/useBaralhoDetail";
import { AddCardsDialog } from "./components/AddCardsDialog";
import { BaralhoCardsFilters } from "./components/BaralhoCardsFilters";
import { BaralhoCardRow } from "./components/BaralhoCardRow";
import { StudyDeckModal } from "@/modules/graph/presentation/components/deck/StudyDeckModal";
import type { BaralhoCardOption } from "../domain/baralho.types";

// 10 cartões por página: são linhas altas (pergunta + resposta + tags).
const PAGE_SIZE = 10;

export function BaralhoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const baralhoId = id ?? "";
  const { baralho, loading, reload } = useBaralhoDetail(baralhoId);
  const [options, setOptions] = useState<BaralhoCardOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studying, setStudying] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [criteria, setCriteria] = useState<BaralhoCardCriteria>(DEFAULT_CARD_CRITERIA);
  const [page, setPage] = useState(1);

  const cards = useMemo(() => baralho?.cards ?? [], [baralho]);
  const tipos = useMemo(() => cardTipoOptions(cards), [cards]);
  const tags = useMemo(() => cardTagOptions(cards), [cards]);
  const visible = useMemo(() => filterAndSortBaralhoCards(cards, criteria), [cards, criteria]);
  const paged = useMemo(() => paginate(visible, page, PAGE_SIZE), [visible, page]);

  // Toda mudança de busca/filtro volta para a página 1.
  const patch = (p: Partial<BaralhoCardCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };

  // Clique numa tag do cartão: o chip só avisa o que foi clicado; aqui vira filtro.
  const selectTag = (selection: ConceptTagSelection): void => {
    if (selection.conceito) { patch({ conceito: selection.conceito }); return; }
    patch({ assuntoId: selection.assuntoId ?? "", topicoId: selection.topicoId ?? "" });
  };
  const clearFilters = (): void => {
    setCriteria(DEFAULT_CARD_CRITERIA);
    setPage(1);
  };

  // Só oferece cartões que ainda não estão no baralho.
  const available = useMemo(
    () => excludeCardsInDeck(options, cards.map((c) => c.id)),
    [options, cards],
  );

  const openAdd = async (): Promise<void> => {
    setAdding(true);
    setLoadingOptions(true);
    try {
      setOptions(await baralhosHttp.listAvailableCards());
    } catch {
      toast.error("Erro ao carregar seus flashcards.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAdd = async (flashcardIds: string[]): Promise<void> => {
    setSubmitting(true);
    try {
      await baralhosHttp.addCards(baralhoId, flashcardIds);
      toast.success(`${flashcardIds.length} cartão(ões) adicionado(s)!`);
      setAdding(false);
      await reload();
    } catch {
      toast.error("Erro ao adicionar os cartões.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (flashcardId: string): Promise<void> => {
    try {
      await baralhosHttp.removeCard(baralhoId, flashcardId);
      toast.success("Cartão removido do baralho.");
      await reload();
    } catch {
      toast.error("Erro ao remover o cartão.");
    }
  };

  const handleRename = async (): Promise<void> => {
    if (!titulo.trim() || titulo === baralho?.titulo) { setRenaming(false); return; }
    try {
      await baralhosHttp.renameBaralho(baralhoId, titulo);
      toast.success("Baralho renomeado!");
      setRenaming(false);
      await reload();
    } catch {
      toast.error("Erro ao renomear. Use um título de até 120 caracteres.");
    }
  };

  if (loading) {
    return <LoadingState message="Carregando o baralho…" />;
  }

  if (!baralho) {
    return (
      <PageContainer className="py-20 text-center text-muted-foreground">
        <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
        <p className="text-lg font-medium">Baralho não encontrado.</p>
        <Link href="/baralhos"><Button variant="link" className="mt-2">Voltar para os baralhos</Button></Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      {renaming ? (
        <div className="flex items-center gap-2">
          <Input
            value={titulo}
            autoFocus
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
          />
          <Button size="sm" onClick={handleRename}><CheckIcon className="size-3.5" /></Button>
        </div>
      ) : (
        <PageHeader
          title={baralho.titulo}
          subtitle={
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <LayersIcon className="size-2.5" />
                {visible.length === cards.length
                  ? `${cards.length} cartão${cards.length !== 1 ? "es" : ""}`
                  : `${visible.length} de ${cards.length} cartões`}
              </Badge>
              {baralho.origens.map((origem) => (
                <Link key={origem.grafoId} href={`/graph/${origem.grafoId}`}>
                  <Badge variant="outline" className="gap-1 text-[10px] font-normal text-muted-foreground hover:text-foreground">
                    <NetworkIcon className="size-2.5" />
                    {origem.nome}
                  </Badge>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => { setTitulo(baralho.titulo); setRenaming(true); }}
                title="Renomear baralho"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
              >
                <PencilIcon className="size-3" />
                Renomear
              </button>
            </span>
          }
          actions={
            <>
              <Button variant="outline" className="h-9" onClick={openAdd}>
                <PlusIcon className="size-4 mr-1" />
                Adicionar cartões
              </Button>
              <Button className="h-9" disabled={baralho.cards.length === 0} onClick={() => setStudying(true)}>
                <PlayIcon className="size-4 mr-1" />
                Estudar
              </Button>
            </>
          }
        />
      )}

      {cards.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-medium">Baralho vazio.</p>
          <p className="text-sm text-zinc-400 mt-1">Adicione cartões para começar a estudar.</p>
        </div>
      ) : (
        <>
          <BaralhoCardsFilters
            criteria={criteria}
            tipos={tipos}
            tags={tags}
            onPatch={patch}
            onClear={clearFilters}
          />
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum cartão encontrado com esses filtros.
            </p>
          ) : (
            <div className="space-y-2">
              {paged.items.map((card) => (
                <BaralhoCardRow
                  key={card.id}
                  card={card}
                  onRemove={() => handleRemove(card.id)}
                  onSelectTag={selectTag}
                />
              ))}
            </div>
          )}
          <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
        </>
      )}

      <AddCardsDialog
        open={adding}
        onOpenChange={setAdding}
        options={available}
        loading={loadingOptions}
        submitting={submitting}
        onAdd={handleAdd}
      />
      <StudyDeckModal
        open={studying}
        onOpenChange={(open) => { if (!open) { setStudying(false); void reload(); } }}
        baralhoId={baralhoId}
      />
    </PageContainer>
  );
}
