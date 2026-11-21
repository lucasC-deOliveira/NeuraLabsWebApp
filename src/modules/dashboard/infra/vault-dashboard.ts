import { desktop, type VaultGraphFolder } from "@/lib/vault-bridge";
import { mergeSrsLogs, readSrsLog, type LocalSession, type LocalSrsLog } from "@/lib/srs-local";
import { graphVaultEntries } from "@/modules/graph/infra/vault/graph-vault-reader";
import { VaultStudyPlanner } from "@/modules/study/infra/vault-study-planner";
import { catalogVaultCards } from "@/modules/study/infra/vault-card-catalog";
import type { ElectronVaultStudyStore } from "@/modules/study/infra/electron-vault-study";
import type { TodayPlan } from "@/modules/study/application/study-plan.types";
import { findVaultGraphFolder } from "@/lib/vault-graph-manifest";
import type { DueCandidate, StudySessionEntry, VaultDashboardMetrics } from "../domain/dashboard.types";
import { vaultDashboardMetrics } from "../domain/services/vault-dashboard-metrics";
import { readVaultDashboardAttempts } from "./vault-dashboard-attempts";

interface GraphDashboardSlice {
  cardIds: string[];
  attempts: StudySessionEntry[];
  incomplete: boolean;
}

export interface VaultDashboardSnapshot extends VaultDashboardMetrics {
  graphs: VaultGraphFolder[];
  plan: TodayPlan | null;
  incomplete: boolean;
}

function reviewEntry(session: LocalSession): StudySessionEntry {
  const totalReviews = session.revisoes.length;
  const correctCount = session.revisoes.filter(({ grade }) => grade !== "again").length;
  return {
    id: `review-${session.id}`, dataInicio: new Date(session.startedAt),
    dataFim: session.endedAt ? new Date(session.endedAt) : null,
    totalReviews, correctCount, incorrectCount: totalReviews - correctCount, avgConfidence: 0,
  };
}

async function graphDashboardSlice(folder: VaultGraphFolder): Promise<GraphDashboardSlice> {
  const files = await desktop.vault.read(folder.directory);
  const nodes = graphVaultEntries(files, folder.id).map(({ node }) => node);
  const titles = new Map(nodes.filter(({ tipo }) => tipo === "PROVA").map(({ id, titulo }) => [id, titulo ?? "Prova"]));
  const archive = await readVaultDashboardAttempts(folder, titles).catch(() => ({ entries: [], incomplete: true }));
  const cardIds = nodes.filter((node) => node.tipo === "FLASHCARD" && node.pergunta && node.resposta).map(({ id }) => id);
  return { cardIds, attempts: archive.entries, incomplete: archive.incomplete };
}

function dashboardDueCandidates(
  cards: ReturnType<typeof catalogVaultCards>, graphCards: string[], log: LocalSrsLog,
): DueCandidate[] {
  const catalog = new Map(cards.map(({ id, schedule }) => [id, schedule]));
  return [...new Set([...catalog.keys(), ...graphCards])].map((id) => {
    const schedule = log.schedule[id] ?? catalog.get(id);
    return { spacedRepetition: schedule ? { proximaRevisao: new Date(schedule.proximaRevisao) } : null };
  });
}

/** Reads dashboard information directly from the selected vault.
 * @example const snapshot = await loadVaultDashboard(store)
 */
export async function loadVaultDashboard(store: ElectronVaultStudyStore): Promise<VaultDashboardSnapshot> {
  const [library, folders, rootLog] = await Promise.all([store.read(), desktop.vault.listGraphFolders(), readSrsLog(store.folder)]);
  const graphIds = [...new Set(folders.map(({ id }) => id))];
  const graphs = graphIds.map((id) => findVaultGraphFolder(folders, id)!);
  const [slices, plan, logs] = await Promise.all([
    Promise.allSettled(graphs.map(graphDashboardSlice)),
    library.plans?.[0] ? new VaultStudyPlanner(store).today(library.plans[0].id).catch(() => null) : null,
    Promise.all(graphs.map(({ directory }) => readSrsLog(directory))),
  ]);
  const loaded = slices.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const log = logs.reduce(mergeSrsLogs, rootLog);
  const cards = dashboardDueCandidates(catalogVaultCards(library), loaded.flatMap(({ cardIds }) => cardIds), log);
  const reviews = log.sessions.filter(({ revisoes }) => revisoes.length > 0).map(reviewEntry);
  const attempts = loaded.flatMap((graph) => graph.attempts);
  const incomplete = loaded.length !== graphs.length || loaded.some((graph) => graph.incomplete) || Boolean(library.plans?.length && !plan);
  return { ...vaultDashboardMetrics(cards, reviews, attempts, new Date()), graphs, plan, incomplete };
}
