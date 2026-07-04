"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PlusIcon, Loader2Icon, FileTextIcon, Trash2Icon, SearchIcon, XIcon, FilterIcon } from "lucide-react";
import { toast } from "sonner";
import { notesHttp } from "../infra/http";
import type { NotaListItem } from "../domain/nota.types";
import {
  filterAndSortNotas, computeNotesStats, countActiveFilters,
  type NotesFilterCriteria, type TimeFilter, type FcFilter, type SortOrder,
} from "../domain/services/nota-filters";
import { NotesStatsBar } from "./components/NotesStatsBar";
import { NoteCard } from "./components/NoteCard";
import { NotesFilterDialog } from "./components/NotesFilterDialog";
import { NotesActiveFilters } from "./components/NotesActiveFilters";
import { NotesDeleteDialogs } from "./components/NotesDeleteDialogs";

const DEFAULT_CRITERIA: NotesFilterCriteria = {
  search: "", conceptFilter: "", timeFilter: "all", fcFilter: "all", sortBy: "date-desc",
};

function NotesLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      <div>
        <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mt-2" />
      </div>
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-8 animate-spin text-zinc-400" />
      </div>
    </div>
  );
}

export function NotesListPage() {
  const [notas, setNotas] = useState<NotaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFromNota, setGeneratingFromNota] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotaListItem | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [criteria, setCriteria] = useState<NotesFilterCriteria>(DEFAULT_CRITERIA);

  const patch = (p: Partial<NotesFilterCriteria>): void => setCriteria((prev) => ({ ...prev, ...p }));

  const load = (): void => {
    notesHttp
      .getNotas()
      .then(setNotas)
      .catch((err) => console.error("Failed to load notes:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allConcepts = useMemo(() => {
    const map = new Map<string, string>();
    for (const nota of notas) for (const c of nota.conceitosRelacionados) map.set(c.id, c.nome);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [notas]);

  const filtered = useMemo(() => filterAndSortNotas(notas, criteria), [notas, criteria]);
  const stats = useMemo(() => computeNotesStats(notas), [notas]);
  const activeFilterCount = countActiveFilters(criteria);

  const clearFilters = (): void => setCriteria((prev) => ({ ...DEFAULT_CRITERIA, search: prev.search }));

  const handleGenerateFlashcards = async (notaId: string): Promise<void> => {
    setGeneratingFromNota(notaId);
    try {
      const result = await notesHttp.generateFlashcards(notaId);
      if (result.flashcards.length > 0) toast.success(`${result.flashcards.length} flashcard(s) gerado(s) a partir da nota!`);
      else toast.info("Nenhum flashcard pôde ser gerado.");
      load();
    } catch {
      toast.error("Erro ao gerar flashcards.");
    } finally {
      setGeneratingFromNota(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await notesHttp.deleteNota(deleteTarget.id);
      toast.success("Nota removida.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Erro ao remover nota.");
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    try {
      const { count } = await notesHttp.deleteAllNotas();
      toast.success(`${count} nota(s) removida(s).`);
      setShowDeleteAllDialog(false);
      load();
    } catch {
      toast.error("Erro ao remover notas.");
    }
  };

  if (loading) return <NotesLoading />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Notas</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {stats.total} nota{stats.total !== 1 && "s"}, {stats.totalWords.toLocaleString("pt-BR")} palavras
          </p>
        </div>
        <div className="flex gap-2">
          {notas.length > 0 && (
            <Button variant="outline" className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 h-9" onClick={() => setShowDeleteAllDialog(true)}>
              <Trash2Icon className="size-3.5 mr-1" />
              Todas
            </Button>
          )}
          <Link href="/notes/new">
            <Button className="w-full sm:w-auto">
              <PlusIcon className="size-4 mr-1" />
              Nova nota
            </Button>
          </Link>
        </div>
      </div>

      <NotesStatsBar stats={stats} />
      <Separator />

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Buscar por titulo ou conteudo..."
            className="pl-9"
            value={criteria.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
          {criteria.search && (
            <button type="button" onClick={() => patch({ search: "" })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <XIcon className="size-3.5 cursor-pointer" />
            </button>
          )}
        </div>
        <NotesFilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          criteria={criteria}
          allConcepts={allConcepts}
          activeFilterCount={activeFilterCount}
          onConcept={(v) => patch({ conceptFilter: v })}
          onTime={(v: TimeFilter) => patch({ timeFilter: v })}
          onFc={(v: FcFilter) => patch({ fcFilter: v })}
          onSort={(v: SortOrder) => patch({ sortBy: v })}
          onClear={clearFilters}
        />
      </div>

      {activeFilterCount > 0 && (
        <NotesActiveFilters
          criteria={criteria}
          allConcepts={allConcepts}
          onClearConcept={() => patch({ conceptFilter: "" })}
          onClearTime={() => patch({ timeFilter: "all" })}
          onClearFc={() => patch({ fcFilter: "all" })}
          onClearAll={clearFilters}
        />
      )}

      {criteria.search && <p className="text-xs text-zinc-400">{filtered.length} de {notas.length} nota(s)</p>}

      {notas.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-8 sm:py-12 text-center space-y-3">
            <FileTextIcon className="size-10 mx-auto text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="text-lg font-medium">Nenhuma nota criada</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Cole texto bruto e transforme em notas com vínculos semânticos.
              </p>
            </div>
            <Link href="/notes/new">
              <Button variant="outline" className="mt-2">Criar primeira nota</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <FilterIcon className="size-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum resultado para os filtros aplicados.</p>
          <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">Limpar filtros</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((nota) => (
            <NoteCard
              key={nota.id}
              nota={nota}
              generating={generatingFromNota === nota.id}
              onGenerate={() => handleGenerateFlashcards(nota.id)}
              onDelete={() => setDeleteTarget(nota)}
            />
          ))}
        </div>
      )}

      <NotesDeleteDialogs
        hasDeleteTarget={!!deleteTarget}
        onCancelDelete={() => setDeleteTarget(null)}
        onConfirmDelete={handleDelete}
        showDeleteAll={showDeleteAllDialog}
        totalCount={stats.total}
        onCancelDeleteAll={() => setShowDeleteAllDialog(false)}
        onConfirmDeleteAll={handleDeleteAll}
      />
    </div>
  );
}
