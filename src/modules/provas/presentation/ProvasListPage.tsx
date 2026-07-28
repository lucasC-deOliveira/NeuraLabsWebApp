"use client";

import { PageContainer } from "@/components/page-container";
import { useMemo, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header/PageHeader";
import { PlusIcon, Trash2Icon, ClipboardListIcon, ChevronRightIcon, BarChart3Icon, GraduationCapIcon, NetworkIcon } from "lucide-react";
import { toast } from "sonner";
import { paginate } from "@/lib/paginate";
import { Pagination } from "@/components/pagination";
import { provasHttp } from "../infra/http";
import type { ProvaListItem } from "../domain/prova.types";
import {
  filterAndSortProvas,
  DEFAULT_PROVA_CRITERIA,
  type ProvaCriteria,
} from "../domain/services/prova-filters";
import { useProvasList } from "./hooks/useProvasList";
import { ProvasFilters } from "./components/ProvasFilters";
import { invalidateProvasList } from "./services/provas-cache";
import { forgetCachedProva } from "./services/prova-detail-cache";
import { MiniGraphModal } from "@/components/mini-graph/MiniGraphModal";

// 11 por página: as linhas são baixas, cabem mais que os cartões de questão.
const PAGE_SIZE = 11;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <ClipboardListIcon className="size-12 text-zinc-300 dark:text-zinc-600" />
      <div>
        <p className="font-medium text-zinc-500">Nenhuma prova ainda</p>
        <p className="text-sm text-zinc-400 mt-1">Monte uma prova selecionando questões e veja o gabarito</p>
      </div>
      <Link href="/provas/new">
        <Button variant="outline" className="gap-2">
          <PlusIcon className="size-4" /> Criar primeira prova
        </Button>
      </Link>
    </div>
  );
}

function ProvaRow({ prova, deleting, onDelete, onAnalytics, onStudy, onGraph }: {
  prova: ProvaListItem;
  deleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onAnalytics: (e: React.MouseEvent) => void;
  onStudy: (e: React.MouseEvent) => void;
  onGraph: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/provas/${prova.id}`}
      className="group flex items-center gap-4 rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <ClipboardListIcon className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{prova.titulo}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[11px] h-5 px-1.5">
            {prova.totalQuestoes} {prova.totalQuestoes === 1 ? "questão" : "questões"}
          </Badge>
          {prova.descricao && (
            <span className="text-xs text-muted-foreground truncate">{prova.descricao}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="text-zinc-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          onClick={onGraph}
          title="Ver mini-grafo"
        >
          <NetworkIcon className="size-4" />
        </button>
        <button
          className="text-zinc-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          onClick={onStudy}
          title="Estudar esta prova"
        >
          <GraduationCapIcon className="size-4" />
        </button>
        <button
          className="text-zinc-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          onClick={onAnalytics}
          title="Ver analytics"
        >
          <BarChart3Icon className="size-4" />
        </button>
        <button
          className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          onClick={onDelete}
          disabled={deleting}
          title="Excluir prova"
        >
          <Trash2Icon className="size-4" />
        </button>
        <ChevronRightIcon className="size-4 text-zinc-400 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

const contarProvas = (n: number): string => `${n} prova${n !== 1 ? "s" : ""}`;

// `onOpenAnalytics`/`onOpenStudy` são injetados pela camada de app
// (src/app/provas/page.tsx): esses modais vivem fora deste módulo, que só pode
// cruzar contexto para `questions` (regra arch `provas-so-consome-questions`).
export function ProvasListPage({ onOpenAnalytics, onOpenStudy }: {
  onOpenAnalytics?: (provaId: string) => void;
  onOpenStudy?: (provaId: string) => void;
}) {
  const { provas, loading, remove } = useProvasList();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [graphProva, setGraphProva] = useState<ProvaListItem | null>(null);
  const [criteria, setCriteria] = useState<ProvaCriteria>(DEFAULT_PROVA_CRITERIA);
  const [page, setPage] = useState(1);

  const visible = useMemo(() => filterAndSortProvas(provas, criteria), [provas, criteria]);
  const paged = useMemo(() => paginate(visible, page, PAGE_SIZE), [visible, page]);

  // Toda mudança de busca/filtro volta para a página 1.
  const patch = (p: Partial<ProvaCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  const clearFilters = (): void => {
    setCriteria(DEFAULT_PROVA_CRITERIA);
    setPage(1);
  };

  const handleDelete = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Excluir esta prova?")) return;
    setDeletingId(id);
    try {
      await provasHttp.deleteProva(id);
      remove(id);
      forgetCachedProva(id); // reabrir a URL da prova excluída não a mostra do cache
      invalidateProvasList(); // e a listagem não a ressuscita em outra tela/aba
      toast.success("Prova excluída");
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Provas"
        subtitle={
          visible.length === provas.length
            ? contarProvas(provas.length)
            : `${visible.length} de ${contarProvas(provas.length)}`
        }
        actions={
          <Link href="/provas/new">
            <Button className="gap-2">
              <PlusIcon className="size-4" />
              Nova prova
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
      ) : provas.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ProvasFilters criteria={criteria} onPatch={patch} onClear={clearFilters} />
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma prova encontrada com esses filtros.
            </p>
          ) : (
            <div className="space-y-3">
              {paged.items.map((p) => (
                <ProvaRow
                  key={p.id}
                  prova={p}
                  deleting={deletingId === p.id}
                  onDelete={(e) => handleDelete(e, p.id)}
                  onAnalytics={(e) => { e.preventDefault(); e.stopPropagation(); onOpenAnalytics?.(p.id); }}
                  onStudy={(e) => { e.preventDefault(); e.stopPropagation(); onOpenStudy?.(p.id); }}
                  onGraph={(e) => { e.preventDefault(); e.stopPropagation(); setGraphProva(p); }}
                />
              ))}
            </div>
          )}
          <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
        </>
      )}
      <MiniGraphModal
        open={!!graphProva}
        onOpenChange={(open) => !open && setGraphProva(null)}
        title={graphProva?.titulo ?? "Mini-grafo"}
        tipo="prova"
        id={graphProva?.id ?? null}
      />
    </PageContainer>
  );
}
