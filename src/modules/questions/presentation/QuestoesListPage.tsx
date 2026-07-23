"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useMemo, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { PlusIcon, ListIcon } from "lucide-react";
import { toast } from "sonner";
import { paginate } from "@/lib/paginate";
import { Pagination } from "@/components/pagination";
import type { ConceptTagSelection } from "@/components/concept-tags";
import { questionsHttp } from "../infra/http";
import {
  filterAndSortQuestoes,
  questaoTipoOptions,
  questaoTagOptions,
  DEFAULT_QUESTAO_CRITERIA,
  type QuestaoCriteria,
} from "../domain/services/questao-filters";
import { useQuestoesList } from "./hooks/useQuestoesList";
import { QuestoesFilters } from "./components/QuestoesFilters";
import { QuestaoCard } from "./components/QuestaoCard";
import { QuestaoItemAnalyticsModal } from "@/modules/analytics/presentation/components/modals/QuestaoItemAnalyticsModal";
import { StudyProvaModal } from "@/modules/graph/presentation/components/deck/StudyProvaModal";
import { MiniGraphModal } from "@/components/mini-graph/MiniGraphModal";
import type { QuestaoListItem } from "../domain/questao.types";

// 10 por página: os cartões são altos (enunciado + alternativas quando expandido).
const PAGE_SIZE = 10;

// "questão" não pluraliza com sufixo: vira "questões". Concatenar produzia
// "210 questãoões".
const contarQuestoes = (n: number): string => `${n} ${n === 1 ? "questão" : "questões"}`;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <ListIcon className="size-12 text-zinc-300 dark:text-zinc-600" />
      <div>
        <p className="font-medium text-zinc-500">Nenhuma questão ainda</p>
        <p className="text-sm text-zinc-400 mt-1">Crie questões de verdadeiro/falso ou múltipla escolha</p>
      </div>
      <Link href="/questions/new">
        <Button variant="outline" className="gap-2">
          <PlusIcon className="size-4" /> Criar primeira questão
        </Button>
      </Link>
    </div>
  );
}

export function QuestoesListPage() {
  const { questoes, loading, reload } = useQuestoesList();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [graphQuestao, setGraphQuestao] = useState<QuestaoListItem | null>(null);
  const [criteria, setCriteria] = useState<QuestaoCriteria>(DEFAULT_QUESTAO_CRITERIA);
  const [page, setPage] = useState(1);

  const tipos = useMemo(() => questaoTipoOptions(questoes), [questoes]);
  const tags = useMemo(() => questaoTagOptions(questoes), [questoes]);
  const visible = useMemo(() => filterAndSortQuestoes(questoes, criteria), [questoes, criteria]);
  const paged = useMemo(() => paginate(visible, page, PAGE_SIZE), [visible, page]);

  // Toda mudança de busca/filtro volta para a página 1.
  const patch = (p: Partial<QuestaoCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  const clearFilters = (): void => {
    setCriteria(DEFAULT_QUESTAO_CRITERIA);
    setPage(1);
  };

  // Clique numa tag: o chip só avisa o que foi clicado; aqui vira filtro.
  const selectTag = (selection: ConceptTagSelection): void => {
    if (selection.conceito) { patch({ conceito: selection.conceito }); return; }
    patch({ assuntoId: selection.assuntoId ?? "", topicoId: selection.topicoId ?? "" });
  };

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      await questionsHttp.deleteQuestao(id);
      toast.success("Questão removida");
      await reload();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Questões"
        subtitle={
          visible.length === questoes.length
            ? contarQuestoes(questoes.length)
            : `${visible.length} de ${contarQuestoes(questoes.length)}`
        }
        actions={
          <Link href="/questions/new">
            <Button className="gap-2">
              <PlusIcon className="size-4" />
              Nova questão
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
      ) : questoes.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <QuestoesFilters
            criteria={criteria}
            tipos={tipos}
            tags={tags}
            onPatch={patch}
            onClear={clearFilters}
          />
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma questão encontrada com esses filtros.
            </p>
          ) : (
            <div className="space-y-3">
              {paged.items.map((q) => (
                <QuestaoCard
                  key={q.id}
                  questao={q}
                  expanded={expandedId === q.id}
                  deleting={deletingId === q.id}
                  onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  onDelete={() => handleDelete(q.id)}
                  onAnalytics={() => setAnalyticsId(q.id)}
                  onStudy={() => setStudyId(q.id)}
                  onGraph={() => setGraphQuestao(q)}
                  onSelectTag={selectTag}
                />
              ))}
            </div>
          )}
          <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
        </>
      )}
      <QuestaoItemAnalyticsModal
        open={analyticsId !== null}
        onOpenChange={(open) => !open && setAnalyticsId(null)}
        questaoId={analyticsId}
      />
      <StudyProvaModal
        open={studyId !== null}
        onOpenChange={(open) => !open && setStudyId(null)}
        provaId={null}
        questaoId={studyId}
      />
      <MiniGraphModal
        open={!!graphQuestao}
        onOpenChange={(open) => !open && setGraphQuestao(null)}
        title={graphQuestao?.enunciado ?? "Mini-grafo"}
        tipo="questao"
        id={graphQuestao?.id ?? null}
      />
    </PageContainer>
  );
}
