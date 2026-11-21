import { expect, it } from "vitest";
import { ElectronVaultStudyStore } from "./electron-vault-study";
import { VaultStudyPlanner } from "./vault-study-planner";
import type { VaultStudyWrite } from "@/lib/vault-bridge";
import type { SaveStudyPlanInput } from "../application/study-plan.types";

class FakeVaultPlanFiles {
  private snapshot: string | null = null;

  async readStudy(): Promise<string | null> {
    return this.snapshot;
  }

  async writeStudy(write: VaultStudyWrite): Promise<boolean> {
    if (write.expected !== this.snapshot) return false;
    this.snapshot = write.next;
    return true;
  }
}

const input: SaveStudyPlanInput = {
  grafoIds: ["graph"], prioridade: "prova", metaTipo: "NOVOS", metaValor: 5,
  dataAlvo: "2026-12-01T00:00:00.000Z", baralhoIds: ["deck"], provaIds: ["exam"], conceitosExcluidos: [],
};

it("persists plans in the selected vault and updates an existing plan without duplicating it", async () => {
  const files = new FakeVaultPlanFiles();
  const local = new VaultStudyPlanner(new ElectronVaultStudyStore("vault", files));
  const plan = await local.save(input);
  const reopened = new VaultStudyPlanner(new ElectronVaultStudyStore("vault", files));
  await expect(reopened.list()).resolves.toEqual([plan]);
  const edited = await reopened.save({ ...input, id: plan.id, metaValor: 10 });
  await expect(local.list()).resolves.toEqual([edited]);
  await reopened.remove(plan.id);
  await expect(local.list()).resolves.toEqual([]);
});

it("reopens the daily session at its durable cursor and records the answer only once", async () => {
  const files = new FakeVaultPlanFiles();
  const store = new ElectronVaultStudyStore("vault", files);
  const planner = new VaultStudyPlanner(store);
  const plan = await planner.save(input);
  const now = new Date();
  await store.update((vault) => ({ ...vault, planSessions: [{
    sessionId: "session", planId: plan.id, day: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
    index: 0, answers: {}, reviews: 0, items: [{ kind: "question", id: "question",
      enunciado: "Prompt", gabarito: "V", explicacao: null, alternativas: null, conceito: null }],
  }] }));
  await planner.advance("session", 0, "V");
  await planner.advance("session", 0, "F");
  const reopened = new VaultStudyPlanner(new ElectronVaultStudyStore("vault", files));
  await expect(reopened.start(plan.id)).resolves.toMatchObject({ index: 1 });
  expect((await store.read()).planSessions?.[0].answers).toEqual({ question: "V" });
});
