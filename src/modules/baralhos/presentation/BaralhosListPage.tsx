"use client";

import { PageContainer } from "@/components/page-container";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header/PageHeader";
import { PlusIcon, DownloadIcon, UploadIcon } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { toast } from "sonner";
import { paginate } from "@/lib/paginate";
import { Pagination } from "@/components/pagination";
import { baralhosHttp } from "../infra/http";
import { toExportPayload, exportFileName } from "../domain/services/export-baralhos";
import { downloadJson, readJsonFile } from "./services/download-json";
import { forgetCachedBaralho } from "./services/baralho-detail-cache";
import { useBaralhosList } from "./hooks/useBaralhosList";
import {
  filterAndSortBaralhos,
  originOptions,
  DEFAULT_BARALHO_CRITERIA,
  type BaralhoCriteria,
} from "../domain/services/baralho-filters";
import { BaralhoCard } from "./components/BaralhoCard";
import { NewBaralhoCard } from "./components/NewBaralhoCard";
import { BaralhosFilters } from "./components/BaralhosFilters";
import { CreateBaralhoDialog } from "./components/CreateBaralhoDialog";
import { ConfirmDeleteBaralhoDialog } from "./components/ConfirmDeleteBaralhoDialog";
import { StudyDeckModal } from "@/modules/graph/presentation/components/deck/StudyDeckModal";
import { DeckAnalyticsModal } from "@/modules/analytics/presentation/components/modals/DeckAnalyticsModal";
import { MiniGraphModal } from "@/components/mini-graph/MiniGraphModal";
import type { BaralhoItem } from "../domain/baralho.types";

// Mini-grafo do baralho (compõe conceitos/tópicos/assuntos dos seus cartões).
function BaralhoMiniGraph({ baralho, onClose }: { baralho: BaralhoItem | null; onClose: () => void }) {
  return (
    <MiniGraphModal
      open={!!baralho}
      onOpenChange={(open) => !open && onClose()}
      title={baralho?.titulo ?? "Mini-grafo"}
      tipo="baralho"
      id={baralho?.id ?? null}
    />
  );
}

// 11 cartões por página: com o cartão "Novo baralho" ocupando a primeira vaga, a
// grade de 3 colunas fecha em 12 sem deixar buraco na última linha.
const PAGE_SIZE = 11;

export function BaralhosListPage() {
  const { baralhos, loading, reload } = useBaralhosList();
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BaralhoItem | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [graphBaralho, setGraphBaralho] = useState<BaralhoItem | null>(null);
  const [criteria, setCriteria] = useState<BaralhoCriteria>(DEFAULT_BARALHO_CRITERIA);
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);

  const origins = useMemo(() => originOptions(baralhos), [baralhos]);
  const visible = useMemo(() => filterAndSortBaralhos(baralhos, criteria), [baralhos, criteria]);
  const paged = useMemo(() => paginate(visible, page, PAGE_SIZE), [visible, page]);

  // Toda mudança de filtro/busca/ordenação volta para a página 1.
  const patch = (p: Partial<BaralhoCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  const clearFilters = (): void => {
    setCriteria(DEFAULT_BARALHO_CRITERIA);
    setPage(1);
  };

  const handleCreate = async (titulo: string): Promise<void> => {
    setSubmitting(true);
    try {
      await baralhosHttp.createBaralho(titulo, []);
      toast.success("Baralho criado!");
      setCreating(false);
      await reload();
    } catch {
      toast.error("Erro ao criar o baralho. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await baralhosHttp.deleteBaralho(deleteTarget.id);
      // Sem isso, reabrir a URL do baralho excluído o mostraria a partir do cache.
      forgetCachedBaralho(deleteTarget.id);
      toast.success("Baralho removido! Os cartões continuam nos seus flashcards.");
      setDeleteTarget(null);
      await reload();
    } catch {
      toast.error("Erro ao remover o baralho. Tente novamente.");
    }
  };

  // O export precisa dos cartões, que a listagem não traz — busca cada baralho.
  const handleExport = async (): Promise<void> => {
    try {
      const details = await Promise.all(baralhos.map((b) => baralhosHttp.getBaralho(b.id)));
      downloadJson(exportFileName(new Date()), toExportPayload(details));
      toast.success(`${details.length} baralho(s) exportado(s)!`);
    } catch {
      toast.error("Erro ao exportar os baralhos.");
    }
  };

  const handleImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const { count } = await baralhosHttp.importBaralhos(await readJsonFile(file));
      toast.success(`${count} baralho(s) importado(s)!`);
      await reload();
    } catch {
      toast.error("Arquivo inválido ou sem baralhos para importar.");
    }
  };

  return (
    <PageContainer className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Baralhos"
        subtitle={
          visible.length === baralhos.length
            ? `${baralhos.length} baralho${baralhos.length !== 1 ? "s" : ""} no total`
            : `${visible.length} de ${baralhos.length} baralhos`
        }
        actions={
          <>
            <Button variant="outline" className="h-9" disabled={baralhos.length === 0} onClick={handleExport}>
              <DownloadIcon className="size-3.5 mr-1" />
              Exportar
            </Button>
            <Button variant="outline" className="h-9" onClick={() => fileInput.current?.click()}>
              <UploadIcon className="size-3.5 mr-1" />
              Importar
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => { void handleImport(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Button onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 mr-1" />
              Novo baralho
            </Button>
          </>
        }
      />

      {baralhos.length > 0 && (
        <BaralhosFilters
          criteria={criteria}
          origins={origins}
          onPatch={patch}
          onClear={clearFilters}
        />
      )}

      {loading ? (
        <LoadingState message="Carregando seus baralhos…" />
      ) : (
        <>
          {baralhos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum baralho ainda. Crie um para agrupar os flashcards que você quer estudar junto.
            </p>
          )}
          {baralhos.length > 0 && visible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum baralho encontrado com esses filtros.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NewBaralhoCard onClick={() => setCreating(true)} />
            {paged.items.map((baralho) => (
              <BaralhoCard
                key={baralho.id}
                baralho={baralho}
                onStudy={() => setStudyId(baralho.id)}
                onDelete={() => setDeleteTarget(baralho)}
                onAnalytics={() => setAnalyticsId(baralho.id)}
                onGraph={() => setGraphBaralho(baralho)}
              />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
        </>
      )}

      <CreateBaralhoDialog
        open={creating}
        onOpenChange={setCreating}
        submitting={submitting}
        onCreate={handleCreate}
      />
      <ConfirmDeleteBaralhoDialog
        titulo={deleteTarget?.titulo ?? null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <StudyDeckModal
        open={studyId !== null}
        onOpenChange={(open) => { if (!open) { setStudyId(null); void reload(); } }}
        baralhoId={studyId}
      />
      <DeckAnalyticsModal
        open={analyticsId !== null}
        onOpenChange={(open) => !open && setAnalyticsId(null)}
        baralhoId={analyticsId}
      />
      <BaralhoMiniGraph baralho={graphBaralho} onClose={() => setGraphBaralho(null)} />
    </PageContainer>
  );
}
