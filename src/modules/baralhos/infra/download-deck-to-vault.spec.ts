import { describe, expect, it } from "vitest";
import type { VaultStudyWrite } from "@/lib/vault-bridge";
import { ElectronVaultStudyStore } from "@/modules/study/infra/electron-vault-study";
import type { BaralhoDetail } from "../domain/baralho.types";
import { storeServerDeckInVault } from "./download-deck-to-vault";

class FakeVaultDeckDownloadFiles {
  snapshot: string | null = null;

  async readStudy(): Promise<string | null> {
    return this.snapshot;
  }

  async writeStudy(update: VaultStudyWrite): Promise<boolean> {
    if (this.snapshot !== update.expected) return false;
    this.snapshot = update.next;
    return true;
  }
}

const serverDeck: BaralhoDetail = {
  id: "server-deck", titulo: "Server deck", dataCriacao: new Date(0), origens: [],
  cards: [{
    id: "server-card", pergunta: "Question", resposta: "Answer", tipo: null, conceito: "",
    conceitosConectados: [], schedule: {
      fase: "REVIEW", learningStep: 0, dificuldade: 3, intervalo: 1, fatorEase: 2.5,
      proximaRevisao: "2026-01-02T00:00:00.000Z", ultimaRevisao: "2026-01-01T00:00:00.000Z",
    },
  }],
};

describe("storeServerDeckInVault", () => {
  it("keeps the server IDs and scheduling data across reopening the vault", async () => {
    const files = new FakeVaultDeckDownloadFiles();
    await storeServerDeckInVault(new ElectronVaultStudyStore("vault", files), serverDeck);
    const { decks } = await new ElectronVaultStudyStore("vault", files).read();
    expect(decks[0]).toMatchObject({
      id: "server-deck", title: "Server deck",
      cards: [{ id: "server-card", schedule: serverDeck.cards[0].schedule }],
    });
  });

  it("does not overwrite the stored copy after a local edit", async () => {
    const store = new ElectronVaultStudyStore("vault", new FakeVaultDeckDownloadFiles());
    await storeServerDeckInVault(store, serverDeck);
    await store.update((library) => ({
      ...library, decks: [{ ...library.decks[0], title: "Edited in vault" }],
    }));
    await storeServerDeckInVault(store, serverDeck);
    const { decks } = await store.read();
    expect(decks.map((deck) => deck.title)).toEqual(["Edited in vault"]);
  });

  it("refuses a partial server payload without replacing existing vault data", async () => {
    const files = new FakeVaultDeckDownloadFiles();
    const store = new ElectronVaultStudyStore("vault", files);
    const incomplete = { ...serverDeck, cards: [{ ...serverDeck.cards[0], schedule: undefined }] };
    await expect(storeServerDeckInVault(store, incomplete)).rejects.toMatchObject({
      reason: "schedule-unavailable", message: expect.stringContaining("server-card"),
    });
    expect(files.snapshot).toBeNull();
  });
});
