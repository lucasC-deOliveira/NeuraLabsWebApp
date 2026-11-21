import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { PlanTodaySummary } from "@/components/study-plan/PlanTodayCard";
import { VAULT_STUDY_CHANGE_EVENT } from "@/lib/vault-study-events";
import type { VaultGraphFolder } from "@/lib/vault-bridge";
import type { VaultDashboardSnapshot } from "../../infra/vault-dashboard";
import { DashboardStatCards } from "./DashboardStatCards";
import { RecentActivity } from "./RecentActivity";

export function VaultDashboardOverview({ load, actions }: {
  load: () => Promise<VaultDashboardSnapshot>;
  actions: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<VaultDashboardSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    load().then((loaded) => {
      if (active) { setSnapshot(loaded); setFailed(false); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [load, revision]);

  useEffect(() => {
    const refresh = (): void => setRevision((value) => value + 1);
    window.addEventListener(VAULT_STUDY_CHANGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(VAULT_STUDY_CHANGE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!snapshot && !failed) return <LoadingState message="Lendo a atividade do vault…" />;
  return (
    <>
      <VaultDashboardStatus failed={failed} incomplete={snapshot?.incomplete ?? false} retry={() => setRevision((value) => value + 1)} />
      {snapshot && <>
        <DashboardStatCards loading={false} dueCardCount={snapshot.dueCardCount} accuracy={snapshot.accuracy}
          streak={snapshot.streak} examAttempts={snapshot.examAttempts} />
        {snapshot.plan && <div className="mb-6"><PlanTodaySummary today={snapshot.plan} /></div>}
        {actions}
        <VaultDashboardGraphs graphs={snapshot.graphs} />
        <RecentActivity loading={false} sessions={snapshot.sessions} />
      </>}
    </>
  );
}

function VaultDashboardStatus({ failed, incomplete, retry }: { failed: boolean; incomplete: boolean; retry: () => void }) {
  if (!failed && !incomplete) return null;
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <p>{failed ? "Não foi possível atualizar o Dashboard pelo vault." : "Parte dos dados do vault não pôde ser lida."}</p>
      <Button variant="outline" size="sm" onClick={retry}>Tentar de novo</Button>
    </div>
  );
}

function VaultDashboardGraphs({ graphs }: { graphs: VaultGraphFolder[] }) {
  if (!graphs.length) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold">Grafos no vault</h2>
      <ul className="flex flex-wrap gap-2">
        {graphs.map(({ id, label }) => <li key={id}><Link href={`/graph/${id}`}
          className="inline-block rounded-lg border px-3 py-2 text-sm hover:border-primary/50">{label}</Link></li>)}
      </ul>
    </section>
  );
}
