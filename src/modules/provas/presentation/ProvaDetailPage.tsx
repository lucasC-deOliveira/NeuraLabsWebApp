"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, EyeOffIcon, ListIcon, KeyIcon } from "lucide-react";
import { toast } from "sonner";
import { paginate } from "@/lib/paginate";
import { Pagination } from "@/components/pagination";
import type { ConceptTagSelection } from "@/components/concept-tags";
import type { ProvaQuestaoItem } from "../domain/prova.types";
import {
  filterAndSortProvaQuestoes,
  provaQuestaoTipoOptions,
  provaQuestaoTagOptions,
  DEFAULT_PROVA_QUESTAO_CRITERIA,
  type ProvaQuestaoCriteria,
} from "../domain/services/prova-questao-filters";
import { useProvaDetail } from "./hooks/useProvaDetail";
import { ProvaQuestoesFilters } from "./components/ProvaQuestoesFilters";
import { ProvaQuestaoCard, GabaritoCompacto } from "./components/ProvaQuestaoCard";

type Tab = "questoes" | "gabarito";

// 10 por página: os cartões são altos (enunciado + alternativas + explicação).
const PAGE_SIZE = 10;

const contarQuestoes = (n: number): string => `${n} ${n === 1 ? "questão" : "questões"}`;

// O número impresso na prova. `ordem` é 0-based (índice na criação da prova).
const numeroDaProva = (pq: ProvaQuestaoItem): number => pq.ordem + 1;

export function ProvaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { prova, loading, erro } = useProvaDetail(id ?? "");
  const [tab, setTab] = useState<Tab>("questoes");
  const [showGabarito, setShowGabarito] = useState(false);
  const [criteria, setCriteria] = useState<ProvaQuestaoCriteria>(DEFAULT_PROVA_QUESTAO_CRITERIA);
  const [page, setPage] = useState(1);

  const questoes = useMemo(() => prova?.questoes ?? [], [prova]);
  const tipos = useMemo(() => provaQuestaoTipoOptions(questoes), [questoes]);
  const tags = useMemo(() => provaQuestaoTagOptions(questoes), [questoes]);
  const visible = useMemo(() => filterAndSortProvaQuestoes(questoes, criteria), [questoes, criteria]);
  const paged = useMemo(() => paginate(visible, page, PAGE_SIZE), [visible, page]);

  // Só volta para a lista quando o backend negou a prova E não há cache: com cache,
  // a página segue aberta (uma falha de rede não é uma prova inexistente).
  useEffect(() => {
    if (!erro || prova) return;
    toast.error("Prova não encontrada");
    router.push("/provas");
    // useRouter devolve um objeto novo a cada render (dep instável).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erro, prova]);

  // Toda mudança de busca/filtro volta para a página 1.
  const patch = (p: Partial<ProvaQuestaoCriteria>): void => {
    setCriteria((prev) => ({ ...prev, ...p }));
    setPage(1);
  };
  const clearFilters = (): void => {
    setCriteria(DEFAULT_PROVA_QUESTAO_CRITERIA);
    setPage(1);
  };

  // Clique numa tag: o chip só avisa o que foi clicado; aqui vira filtro.
  const selectTag = (selection: ConceptTagSelection): void => {
    if (selection.conceito) { patch({ conceito: selection.conceito }); return; }
    patch({ assuntoId: selection.assuntoId ?? "", topicoId: selection.topicoId ?? "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!prova) return null;

  const vazio = visible.length === 0;

  return (
    <PageContainer>
      <PageHeader
        title={prova.titulo}
        subtitle={
          <span className="flex flex-col gap-2">
            {prova.descricao && <span>{prova.descricao}</span>}
            <span>
              <Badge variant="outline" className="text-xs">
                {visible.length === questoes.length
                  ? contarQuestoes(questoes.length)
                  : `${visible.length} de ${contarQuestoes(questoes.length)}`}
              </Badge>
            </span>
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
        <button
          onClick={() => setTab("questoes")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "questoes"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListIcon className="size-4" /> Questões
        </button>
        <button
          onClick={() => setTab("gabarito")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "gabarito"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyIcon className="size-4" /> Gabarito
        </button>
      </div>

      <div className="space-y-4">
        {/* Os filtros valem para as duas abas: são a mesma prova, vista de dois jeitos. */}
        <ProvaQuestoesFilters
          criteria={criteria}
          tipos={tipos}
          tags={tags}
          onPatch={patch}
          onClear={clearFilters}
        />

        {vazio ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma questão encontrada com esses filtros.
          </p>
        ) : tab === "questoes" ? (
          <>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setShowGabarito((v) => !v)}
              >
                {showGabarito ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                {showGabarito ? "Ocultar gabarito" : "Ver gabarito"}
              </Button>
            </div>
            {paged.items.map((pq) => (
              <ProvaQuestaoCard
                key={pq.id}
                pq={pq}
                numero={numeroDaProva(pq)}
                showGabarito={showGabarito}
                onSelectTag={selectTag}
              />
            ))}
          </>
        ) : (
          <>
            {/* O gabarito compacto é a visão de relance: mostra tudo que passou pelo
                filtro de uma vez, sem paginar. */}
            <GabaritoCompacto questoes={visible} />

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Gabarito detalhado</p>
              {paged.items.map((pq) => (
                <ProvaQuestaoCard
                  key={pq.id}
                  pq={pq}
                  numero={numeroDaProva(pq)}
                  showGabarito={true}
                  onSelectTag={selectTag}
                />
              ))}
            </div>
          </>
        )}

        <Pagination page={paged.page} totalPages={paged.totalPages} onPage={setPage} />
      </div>
    </PageContainer>
  );
}
