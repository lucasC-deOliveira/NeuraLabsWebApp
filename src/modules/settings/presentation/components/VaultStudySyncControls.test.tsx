import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  readVaultStudySyncSettings, runVaultStudySync, setVaultStudySyncPromptEnabled, type VaultStudySyncSettings,
} from "@/modules/study/infra/configured-vault-study-sync";
import { VaultStudySyncControls } from "./VaultStudySyncControls";

vi.mock("@/lib/api", () => ({ getToken: () => "signed-in" }));

vi.mock("@/modules/study/infra/configured-vault-study-sync", () => ({
  readVaultStudySyncSettings: vi.fn(),
  setVaultStudySyncPromptEnabled: vi.fn(),
  linkVaultStudyDeck: vi.fn(),
  runVaultStudySync: vi.fn(),
  setVaultStudySyncEnabled: vi.fn(),
}));

class FakeVaultSyncPreferences {
  private promptEnabled = true;

  readonly read = async (): Promise<VaultStudySyncSettings> => ({
    enabled: true, promptEnabled: this.promptEnabled,
    decks: [{ id: "deck", title: "Deck", linked: true }],
  });

  readonly savePrompt = async (_folder: string, enabled: boolean): Promise<void> => {
    this.promptEnabled = enabled;
  };
}

describe("VaultStudySyncControls", () => {
  it("turns off the popup independently of manual sync", async () => {
    const preferences = new FakeVaultSyncPreferences();
    vi.mocked(readVaultStudySyncSettings).mockImplementation(preferences.read);
    vi.mocked(setVaultStudySyncPromptEnabled).mockImplementation(preferences.savePrompt);
    vi.mocked(runVaultStudySync).mockResolvedValue({ confirmed: 0, updated: 0, pending: 0 });
    render(<VaultStudySyncControls folder="vault" />);

    const popup = await screen.findByRole("checkbox", { name: "Mostrar aviso de sincronização" });
    expect(popup).toBeChecked();
    fireEvent.click(popup);
    await waitFor(() => expect(popup).not.toBeChecked());
    expect(setVaultStudySyncPromptEnabled).toHaveBeenCalledWith("vault", false);
    expect(screen.getByRole("checkbox", { name: "Sincronizar com o servidor" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Sincronizar agora" }));
    await waitFor(() => expect(runVaultStudySync).toHaveBeenCalledWith("vault"));
  });
});
