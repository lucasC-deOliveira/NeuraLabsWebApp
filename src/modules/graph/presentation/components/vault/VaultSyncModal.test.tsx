import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VaultSyncModal } from "./VaultSyncModal";
import { desktop } from "@/lib/vault-bridge";

vi.mock("@/lib/vault-bridge", () => ({
  desktop: {
    vault: {
      getPath: vi.fn(() => Promise.resolve("/vault")),
      pickFolder: vi.fn(),
      openFolder: vi.fn(),
    },
  },
}));
vi.mock("@/lib/vault-sync", () => ({
  pullVault: vi.fn(),
  pushVault: vi.fn(),
  graphVaultDir: vi.fn(() => "/vault/graph"),
  compareSyncState: vi.fn(() => Promise.reject(new Error("no state"))),
  getSyncState: vi.fn(() => Promise.resolve(null)),
  removeOrphans: vi.fn(),
}));
vi.mock("@/lib/vault-guide", () => ({ buildVaultGuide: () => "guide", VAULT_GUIDE_FILENAME: "AGENTS.md" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("VaultSyncModal", () => {
  it("resolves the vault path on open and shows it", async () => {
    render(<VaultSyncModal open onOpenChange={vi.fn()} grafoId="g1" grafoNome="Bio" onSynced={vi.fn()} />);
    await waitFor(() => expect(desktop.vault.getPath).toHaveBeenCalled());
    expect(await screen.findByDisplayValue("/vault")).toBeInTheDocument();
  });
});
