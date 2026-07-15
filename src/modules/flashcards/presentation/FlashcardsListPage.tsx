"use client";

import { PageContainer } from "@/components/page-container";
import { useMemo, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header/PageHeader";
import { PlusIcon, Trash2Icon, SearchIcon, XIcon, Loader2Icon, LayersIcon } from "lucide-react";
import { toast } from "sonner";
import { flashcardsHttp } from "../infra/http";
import type { FlashcardItem } from "../domain/flashcard.types";
import {
  filterAndSortFlashcards, computeFlashcardStats, countActiveFilters,
  type FlashcardCriteria, type StatusFilter, type FlashcardSort, type TipoFilter,
} from "../domain/services/flashcard-filters";
import { paginate } from "@/lib/paginate";
import { useFlashcardsData } from "./hooks/useFlashcardsData";
import { FlashcardsStatsBar } from "./components/FlashcardsStatsBar";
import { Pagination } from "@/components/pagination";
import { FlashcardsFilterDialog } from "./components/FlashcardsFilterDialog";
import { FlashcardsActiveFilters } from "./components/FlashcardsActiveFilters";
import { FlashcardCard } from "./components/FlashcardCard";
import { FlashcardDetailDialog } from "./components/FlashcardDetailDialog";
import { FlashcardEditDialog, type FlashcardForm } from "./components/FlashcardEditDialog";
import { FlashcardDeleteDialogs } from "./components/FlashcardDeleteDialogs";

const DEFAULT_CRITERIA: FlashcardCriteria = {
  search: "", assuntoFilter: "", topicoFilter: "", tipoFilter: "", statusFilter: "all", sortBy: "date",
};
const EMPTY_FORM: FlashcardForm = { pergunta: "", resposta: "", conceitoId: "" };
const PAGE_SIZE = 12;

export function FlashcardsListPage() {
  const { snapshot, loading, reload } = useFlashcardsData();
  const { cards: flashcards, filterData, concepts } = snapshot;
  const [submitting, setSubmitting] = useState(false);

  const [criteria, setCriteria] = useState<FlashcardCriteria>(DEFAULT_CRITERIA);
  const [page, setPage] = useState(1);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardItem | null>(null);
  const [form, setForm] = useState<FlashcardForm>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<FlashcardItem | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [detailCard, setDetailCard] = useState<FlashcardItem | null>(null);

  // Toda mudança de filtro/busca/ordenação volta para a página 1.
  const patch = (p: Partial<FlashcardCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  const patchForm = (p: Partial<FlashcardForm>): void => setForm((prev) => ({ ...prev, ...p }));

  const availableTopicos = useMemo(
    () => (criteria.assuntoFilter ? filterData.find((a) => a.id === criteria.assuntoFilter)?.topicos ?? [] : []),
    [criteria.assuntoFilter, filterData],
  );
  const filtered = useMemo(() => filterAndSortFlashcards(flashcards, criteria), [flashcards, criteria]);
  const paged = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);
  const stats = useMemo(() => computeFlashcardStats(flashcards), [flashcards]);
  const activeFilterCount = countActiveFilters(criteria);

  const clearFilters = (): void => { setCriteria(DEFAULT_CRITERIA); setPage(1); };

  const openEdit = (card: FlashcardItem): void => {
    setEditingCard(card);
    setForm({ pergunta: card.pergunta, resposta: card.resposta, conceitoId: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.pergunta.trim() || !form.resposta.trim() || !form.conceitoId) {
      toast.error("Preencha todos os campos antes de salvar.");
      return;
    }
    setSubmitting(true);
    try {
      if (editingCard) {
        await flashcardsHttp.updateFlashcard(editingCard.id, { pergunta: form.pergunta, resposta: form.resposta });
      } else {
        await flashcardsHttp.createFlashcard({ pergunta: form.pergunta, resposta: form.resposta, conceitoId: form.conceitoId });
      }
      toast.success(editingCard ? "Flashcard atualizado!" : "Flashcard criado!");
      setDialogOpen(false);
      await reload();
    } catch {
      toast.error("Erro ao salvar o flashcard. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await flashcardsHttp.deleteFlashcard(deleteTarget.id);
      toast.success("Flashcard removido!");
      setDeleteTarget(null);
      await reload();
    } catch {
      toast.error("Erro ao remover o flashcard. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    try {
      const { count } = await flashcardsHttp.deleteAllFlashcards();
      toast.success(`${count} flashcard(s) removido(s)!`);
      setShowDeleteAllDialog(false);
      await reload();
    } catch {
      toast.error("Erro ao remover flashcards.");
    }
  };

  return (
    <PageContainer className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Flashcards"
        subtitle={`${stats.total} flashcard${stats.total !== 1 ? "s" : ""} no total`}
        actions={
          <>
            {stats.total > 0 && (
              <Button variant="outline" className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 h-9" onClick={() => setShowDeleteAllDialog(true)}>
                <Trash2Icon className="size-3.5 mr-1" />
                Todos
              </Button>
            )}
            <Link href="/flashcards/new">
              <Button className="w-full sm:w-auto">
                <PlusIcon className="size-4 mr-1" />
                Novo flashcard
              </Button>
            </Link>
          </>
        }
      />

      <FlashcardsStatsBar stats={stats} />
      <Separator />

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta, resposta, conceito, topico, materia..."
            className="pl-9"
            value={criteria.search}
            onChange={(e) => patch({ search: e.target.value, topicoFilter: "" })}
          />
          {criteria.search && (
            <button type="button" onClick={() => patch({ search: "" })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <XIcon className="size-3.5 cursor-pointer" />
            </button>
          )}
        </div>
        <FlashcardsFilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          criteria={criteria}
          filterData={filterData}
          availableTopicos={availableTopicos}
          activeFilterCount={activeFilterCount}
          onAssunto={(v) => patch({ assuntoFilter: v, topicoFilter: "" })}
          onTopico={(v: string) => patch({ topicoFilter: v })}
          onTipo={(v: TipoFilter) => patch({ tipoFilter: v })}
          onStatus={(v: StatusFilter) => patch({ statusFilter: v })}
          onSort={(v: FlashcardSort) => patch({ sortBy: v })}
          onClear={clearFilters}
        />
      </div>

      {activeFilterCount > 0 && (
        <FlashcardsActiveFilters
          criteria={criteria}
          filterData={filterData}
          availableTopicos={availableTopicos}
          onClearAssunto={() => patch({ assuntoFilter: "", topicoFilter: "" })}
          onClearTopico={() => patch({ topicoFilter: "" })}
          onClearTipo={() => patch({ tipoFilter: "" })}
          onClearStatus={() => patch({ statusFilter: "all" })}
          onClearSort={() => patch({ sortBy: "date" })}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-medium">Nenhum flashcard encontrado.</p>
          <p className="text-sm text-zinc-400 mt-1">Crie seu primeiro flashcard para comecar!</p>
          <Link href="/flashcards/new">
            <Button variant="link" className="mt-2">Criar novo flashcard</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400">{filtered.length} flashcard{filtered.length !== 1 && "s"} filtrado{filtered.length !== 1 && "s"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paged.items.map((fc) => (
              <FlashcardCard
                key={fc.id}
                fc={fc}
                onDetail={() => setDetailCard(fc)}
                onEdit={() => openEdit(fc)}
                onDelete={() => setDeleteTarget(fc)}
                onFilter={patch}
              />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
        </>
      )}

      <FlashcardDetailDialog
        card={detailCard}
        onClose={() => setDetailCard(null)}
        onEdit={() => { const c = detailCard; setDetailCard(null); if (c) openEdit(c); }}
      />
      <FlashcardEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={!!editingCard}
        form={form}
        concepts={concepts}
        submitting={submitting}
        onChange={patchForm}
        onSubmit={handleSubmit}
      />
      <FlashcardDeleteDialogs
        deleteTargetPergunta={deleteTarget?.pergunta ?? null}
        submitting={submitting}
        onCancelDelete={() => setDeleteTarget(null)}
        onConfirmDelete={confirmDelete}
        showDeleteAll={showDeleteAllDialog}
        totalCount={stats.total}
        onCancelDeleteAll={() => setShowDeleteAllDialog(false)}
        onConfirmDeleteAll={handleDeleteAll}
      />
    </PageContainer>
  );
}
