"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { listUserGraphs } from "@/lib/graph-api";
import {
  getStudyPlans,
  getTodayPlan,
  startPlannedSession,
  deleteStudyPlan,
  type StudyPlan,
  type TodayPlan,
  type PlannedSession,
} from "@/lib/study-plan-api";
import { PlanSetup } from "./PlanSetup";
import { TodayView } from "./TodayView";
import { PlannedSessionModal } from "./PlannedSessionModal";
import { loadCachedToday, saveCachedToday, invalidateToday } from "./today-plan-cache";
import { saveCachedPlans } from "./study-plans-cache";
import { isDesktop } from "@/lib/vault-bridge";
import { configuredStudyVault } from "@/modules/study/infra/electron-vault-study";
import { VaultStudyPlanner } from "@/modules/study/infra/vault-study-planner";
import type { VaultPlanStudyPort } from "@/modules/study/application/vault-study-plan.port";

interface GraphOption {
  id: string;
  nome: string;
}

type Mode = "view" | "new" | "edit";

const BASE_LABEL: Record<string, string> = {
  ai: "IA",
  prova: "Prova",
  edital: "Edital",
  prova_edital: "Prova+edital",
};

export function StudyPlanPage() {
  const [vault, setVault] = useState<VaultPlanStudyPort | null | undefined>(isDesktop() ? undefined : null);
  const [server, setServer] = useState(false);
  useEffect(() => {
    if (!isDesktop()) return;
    let active = true;
    configuredStudyVault()
      .then((store) => { if (active) setVault(store ? new VaultStudyPlanner(store) : null); })
      .catch(() => { if (active) { setVault(null); toast.error("Não foi possível acessar o vault configurado."); } });
    return () => { active = false; };
  }, []);
  if (vault === undefined) return <LoadingState message="Carregando a pasta do vault…" />;
  const showVaultSource = vault !== null && !server;
  const source = vault ? (
    <div role="group" aria-label="Origem dos planos" className="flex flex-wrap gap-1.5">
      <Button size="sm" variant={server ? "outline" : "default"} aria-pressed={!server} onClick={() => setServer(false)}>Vault</Button>
      <Button size="sm" variant={server ? "default" : "outline"} aria-pressed={server} onClick={() => setServer(true)}>Servidor</Button>
    </div>
  ) : null;
  return <StudyPlanContent key={showVaultSource ? "vault" : "server"} vault={showVaultSource ? vault : null} source={source} />;
}

function StudyPlanContent({ vault, source }: { vault: VaultPlanStudyPort | null; source: React.ReactNode }) {
  const [graphs, setGraphs] = useState<GraphOption[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [today, setToday] = useState<TodayPlan | null>(null);
  const [todayError, setTodayError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PlannedSession | null>(null);
  const readToday = vault ? (id: string) => vault.today(id) : getTodayPlan;
  const listPlans = vault ? () => vault.list() : getStudyPlans;
  const visibleToday = today ?? (vault || !selectedId ? null : loadCachedToday(selectedId));

  useEffect(() => {
    let active = true;
    const storedGraphs = vault ? vault.graphs() : listUserGraphs({ pageSize: 100 }).then((g) => g.items);
    Promise.all([storedGraphs, vault ? vault.list() : getStudyPlans()])
      .then(([g, p]) => {
        if (!active) return;
        setGraphs(g.map((x) => ({ id: x.id, nome: x.nome })));
        setPlans(p);
        if (!vault) saveCachedPlans(p); // alimenta o card da home (PlanTodayCard abre instantâneo)
        setSelectedId(p[0]?.id ?? null);
        setMode(p.length === 0 ? "new" : "view");
      })
      .catch(() => { if (active) toast.error("Não foi possível carregar seus planos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [vault]);

  useEffect(() => {
    if (mode !== "view" || !selectedId) return;
    let active = true;
    const cached = vault ? null : loadCachedToday(selectedId);
    (vault ? vault.today(selectedId) : getTodayPlan(selectedId))
      .then((t) => { if (active) { setToday(t); setTodayError(!t); if (t && !vault) saveCachedToday(selectedId, t); } })
      .catch(() => { if (active && !cached) setTodayError(true); }); // com cache na tela, não vira erro
    return () => { active = false; };
  }, [selectedId, mode, vault]);

  // Recarrega o "hoje" do plano atual (usado no retry e ao selecionar o mesmo plano).
  const reloadToday = (): void => {
    if (!selectedId) return;
    setToday(null);
    setTodayError(false);
    readToday(selectedId)
      .then((t) => { setToday(t); setTodayError(!t); if (t && !vault) saveCachedToday(selectedId, t); })
      .catch(() => setTodayError(true));
  };

  const graphName = (grafoId: string): string => graphs.find((g) => g.id === grafoId)?.nome ?? "Grafo";
  // Rótulo do conteúdo do plano: 1 grafo → o nome; vários → "N grafos"; nenhum → "Conteúdo".
  const contentLabel = (p: StudyPlan): string =>
    p.grafoIds.length === 1
      ? graphName(p.grafoIds[0])
      : p.grafoIds.length > 1
        ? `${p.grafoIds.length} grafos`
        : "Conteúdo";
  const planLabel = (p: StudyPlan): string =>
    `${contentLabel(p)} · ${vault && p.prioridade === "ai" ? "Grafo" : BASE_LABEL[p.prioridade.split("|")[0]] ?? p.prioridade}`;
  const current = plans.find((p) => p.id === selectedId) ?? null;

  const afterSave = (plan: StudyPlan): void => {
    invalidateToday(plan.id); // a config mudou → o "hoje" cacheado desse plano some
    listPlans().then((ps) => { setPlans(ps); if (!vault) saveCachedPlans(ps); }).catch(() => {});
    setSelectedId(plan.id);
    setToday(null);
    setMode("view");
  };

  const remover = (): void => {
    if (!selectedId || !window.confirm("Remover este plano? Seu histórico de estudo não é afetado.")) return;
    invalidateToday(selectedId); // plano removido → seu "hoje" cacheado não pode ressuscitar
    (vault ? vault.remove(selectedId) : deleteStudyPlan(selectedId))
      .then(listPlans)
      .then((ps) => {
        setPlans(ps);
        if (!vault) saveCachedPlans(ps); // mantém o card da home em dia após remover
        setSelectedId(ps[0]?.id ?? null);
        setToday(null);
        setMode(ps.length === 0 ? "new" : "view");
        toast.success("Plano removido.");
      })
      .catch(() => toast.error("Não foi possível remover o plano."));
  };

  const estudar = (): void => {
    if (!selectedId) return;
    (vault ? vault.start(selectedId) : startPlannedSession(selectedId))
      .then((s) => {
        if (!s || (s.index ?? 0) >= s.items.length) { toast.info("Nada para estudar agora — volte mais tarde."); return; }
        setSession(s);
      })
      .catch(() => toast.error("Não foi possível iniciar a sessão."));
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader title="Plano de Estudo" subtitle="Seu ritmo diário, guiado pelo roadmap e pela repetição espaçada" />
      {source}

      {loading ? (
        <LoadingState message="Carregando…" />
      ) : graphs.length === 0 && !vault ? (
        <p className="text-sm text-muted-foreground">Crie um grafo primeiro para montar um plano de estudo.</p>
      ) : (
        <>
          <PlanTabs
            plans={plans}
            selectedId={selectedId}
            mode={mode}
            label={planLabel}
            onSelect={(id) => {
              // Reclicar o plano já aberto: só recarrega (sem trocar deps, o efeito não roda).
              if (id === selectedId && mode === "view") { reloadToday(); return; }
              setSelectedId(id);
              setToday(null);
              setTodayError(false);
              setMode("view");
            }}
            onNew={() => setMode("new")}
          />

          {mode === "new" || (mode === "edit" && current) ? (
            <PlanSetup
              graphs={graphs}
              initial={mode === "edit" ? current : null}
              onSaved={afterSave}
              vault={vault ?? undefined}
              onCancel={plans.length > 0 ? () => setMode("view") : undefined}
            />
          ) : visibleToday ? (
            <TodayView today={visibleToday} onStudy={estudar} onEdit={() => setMode("edit")} onDelete={remover} />
          ) : todayError ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">Não foi possível carregar o plano de hoje.</p>
              <Button variant="outline" size="sm" onClick={reloadToday}>Tentar de novo</Button>
            </div>
          ) : (
            <LoadingState message="Carregando o plano de hoje…" />
          )}
        </>
      )}

      <PlannedSessionModal
        session={session}
        vault={vault ?? undefined}
        onClose={() => {
          setSession(null);
          // Sessão concluída: as revisões do dia mudaram → invalida e revalida o "hoje".
          if (selectedId) {
            invalidateToday(selectedId);
            readToday(selectedId)
              .then((t) => { setToday(t); if (t && !vault) saveCachedToday(selectedId, t); })
              .catch(() => {});
          }
        }}
      />
    </PageContainer>
  );
}

function PlanTabs({ plans, selectedId, mode, label, onSelect, onNew }: {
  plans: StudyPlan[];
  selectedId: string | null;
  mode: Mode;
  label: (p: StudyPlan) => string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {plans.map((p) => {
        const active = mode === "view" && p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {label(p)}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          mode === "new" ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground hover:border-primary/40"
        }`}
      >
        <PlusIcon className="size-3.5" /> Novo plano
      </button>
    </div>
  );
}
