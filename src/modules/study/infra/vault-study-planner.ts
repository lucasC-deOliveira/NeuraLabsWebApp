import type { FlashcardItem, PlannedSession, PlanScope, SaveStudyPlanInput, StudyPlan, TodayPlan } from "../application/study-plan.types";
import { readSrsLog, type ReviewGrade } from "@/lib/srs-local";
import { listLocalGraphs } from "@/modules/graph/infra/vault/graph-vault-reader";
import type { VaultPlanGraph, VaultPlanOption, VaultPlanStudyPort } from "../application/vault-study-plan.port";
import { buildVaultPlanQueue } from "../application/vault-plan-queue";
import type { VaultLibrary } from "../domain/vault-library";
import type { VaultPlanSession } from "../domain/vault-study-plan";
import { ElectronVaultStudyStore } from "./electron-vault-study";
import { readPlanGraphNodes, vaultPlanContent } from "./vault-plan-content";
import { gradeVaultPlannedCard } from "./vault-plan-review";

function currentSession(library: VaultLibrary, planId: string, day: string): VaultPlanSession | undefined {
  return library.planSessions?.find((session) => session.planId === planId && session.day === day && !session.superseded);
}

function remainingToday(today: TodayPlan, session: VaultPlanSession): TodayPlan {
  const remaining = session.items.length - session.index;
  const reviews = Math.max(0, session.reviews - session.index);
  return {
    ...today, target: { reviews, novos: remaining - reviews, feynman: 0, estMinutes: Math.ceil(remaining / 2), note: null },
  };
}

function vaultPlanDay(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function requirePlanSession(library: VaultLibrary, id: string): VaultPlanSession {
  const session = library.planSessions?.find((entry) => entry.sessionId === id);
  if (!session) throw new Error(`Missing study session "${id}". Expected a session in the selected vault.`);
  return session;
}

/** Implements the study-plan screen with durable plans and resumable daily sessions.
 * @example const planner = new VaultStudyPlanner(store)
 */
export class VaultStudyPlanner implements VaultPlanStudyPort {
  constructor(private readonly store: ElectronVaultStudyStore) {}

  async graphs(): Promise<VaultPlanGraph[]> {
    return listLocalGraphs();
  }

  async list(): Promise<StudyPlan[]> {
    return (await this.store.read()).plans ?? [];
  }

  async scope(graphIds: string[]): Promise<PlanScope> {
    const nodes = await readPlanGraphNodes(graphIds);
    return { hasProva: nodes.some(({ tipo }) => tipo === "PROVA"), hasEdital: false };
  }

  async sources(): Promise<{ decks: VaultPlanOption[]; exams: VaultPlanOption[] }> {
    const [library, graphs] = await Promise.all([this.store.read(), this.graphs()]);
    const nodes = await readPlanGraphNodes(graphs.map(({ id }) => id));
    const decks = library.decks.map(({ id, title }) => ({ id, titulo: title }));
    const exams = new Map(nodes.filter(({ tipo }) => tipo === "PROVA").map(({ id, titulo }) => [id, { id, titulo: titulo ?? id }]));
    return { decks, exams: [...exams.values()] };
  }

  async save(input: SaveStudyPlanInput): Promise<StudyPlan> {
    const plan = { ...input, id: input.id ?? crypto.randomUUID(), ativo: true };
    await this.store.update((library) => ({
      ...library,
      plans: [plan, ...(library.plans ?? []).filter(({ id }) => id !== plan.id)],
      planSessions: library.planSessions?.map((session) => session.planId === plan.id && session.day === vaultPlanDay(new Date())
        ? { ...session, superseded: true } : session),
    }));
    return plan;
  }

  async remove(id: string): Promise<void> {
    await this.store.update((library) => ({ ...library, plans: library.plans?.filter((plan) => plan.id !== id) }));
  }

  private async queue(library: VaultLibrary, plan: StudyPlan, now: Date): Promise<ReturnType<typeof buildVaultPlanQueue>> {
    const graphIds = plan.provaIds.length ? (await this.graphs()).map(({ id }) => id) : plan.grafoIds;
    const [nodes, log] = await Promise.all([readPlanGraphNodes(graphIds), readSrsLog(this.store.folder)]);
    const schedules = Object.fromEntries(library.decks.flatMap(({ cards }) => cards.flatMap(({ id, schedule }) =>
      schedule ? [[id, schedule] as const] : [])));
    return buildVaultPlanQueue(plan, { ...vaultPlanContent(nodes, plan, library), schedules: { ...schedules, ...log.schedule } }, now);
  }

  async today(id: string): Promise<TodayPlan | null> {
    const library = await this.store.read();
    const plan = library.plans?.find((entry) => entry.id === id);
    if (!plan) return null;
    const now = new Date();
    const { today } = await this.queue(library, plan, now);
    const session = currentSession(library, id, vaultPlanDay(now));
    return session ? remainingToday(today, session) : today;
  }

  async start(id: string): Promise<PlannedSession | null> {
    const library = await this.store.read();
    const plan = library.plans?.find((entry) => entry.id === id);
    if (!plan) return null;
    const now = new Date();
    const day = vaultPlanDay(now);
    const existing = currentSession(library, id, day);
    if (existing) return existing;
    const { items, today } = await this.queue(library, plan, now);
    if (!items.length) return null;
    const session = { sessionId: crypto.randomUUID(), planId: id, day, index: 0, items, answers: {}, reviews: today.target.reviews };
    const committed = await this.store.update((snapshot) => currentSession(snapshot, id, day)
      ? snapshot : { ...snapshot, planSessions: [...(snapshot.planSessions ?? []), session] });
    return currentSession(committed, id, day) ?? null;
  }

  async grade(sessionId: string, card: FlashcardItem, grade: ReviewGrade): Promise<void> {
    const library = await this.store.read();
    const session = requirePlanSession(library, sessionId);
    const item = session.items[session.index];
    if (item?.kind !== "flashcard" || item.id !== card.id) return;
    const baseline = library.decks.flatMap(({ cards }) => cards).find(({ id }) => id === card.id)?.schedule ?? undefined;
    await gradeVaultPlannedCard(this.store.folder, sessionId, card.id, grade, baseline);
    await this.advance(sessionId, session.index);
  }

  async advance(sessionId: string, index: number, answer?: string): Promise<void> {
    await this.store.update((library) => {
      const session = requirePlanSession(library, sessionId);
      const item = session.items[index];
      if (session.index !== index || !item) return library;
      const answers = item.kind === "question" && answer ? { ...session.answers, [item.id]: answer } : session.answers;
      const planSessions = library.planSessions?.map((entry) => entry === session ? { ...session, index: index + 1, answers } : entry);
      return { ...library, planSessions };
    });
  }
}
