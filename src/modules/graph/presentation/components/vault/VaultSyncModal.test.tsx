import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VaultSyncModal } from "./VaultSyncModal";
import { desktop } from "@/lib/vault-bridge";
import { pushVault } from "@/lib/vault-sync";

vi.mock("@/lib/vault-bridge", () => ({
  desktop: {
    vault: {
      getPath: vi.fn(() => Promise.resolve("/vault")),
      pickFolder: vi.fn(),
      openFolder: vi.fn(),
      read: vi.fn(async () => []),
      readFile: vi.fn(async () => null),
      listGraphFolders: vi.fn(async () => []),
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
vi.mock("@/lib/vault-graph-publication", () => ({ readPendingVaultGraph: vi.fn(async () => null) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("VaultSyncModal", () => {
  it("resolves the vault path on open and shows it", async () => {
    render(<VaultSyncModal open onOpenChange={vi.fn()} grafoId="g1" grafoNome="Bio" onSynced={vi.fn()} />);
    await waitFor(() => expect(desktop.vault.getPath).toHaveBeenCalled());
    expect(await screen.findByDisplayValue("/vault")).toBeInTheDocument();
  });

  it("reports the active server stage and keeps the failure visible in the dialog", async () => {
    const transfer = Promise.withResolvers<Awaited<ReturnType<typeof pushVault>>>();
    vi.mocked(pushVault).mockImplementationOnce((_id, _name, report) => {
      report?.({ phase: "sending", nodes: 42, edges: 13 });
      return transfer.promise;
    });
    render(<VaultSyncModal open onOpenChange={vi.fn()} grafoId="g1" grafoNome="Bio" />);
    const push = await screen.findByRole("button", { name: "Push" });
    await waitFor(() => expect(push).toBeEnabled());
    await userEvent.click(push);
    expect(await screen.findByText("Aguardando a gravação no servidor")).toBeVisible();
    expect(screen.getByText(/42 nó\(s\) e 13 relação/)).toBeVisible();
    await act(async () => transfer.reject(new Error("Conexão interrompida")));
    expect(screen.getByRole("alert")).toHaveTextContent("Falha na etapa");
    expect(screen.getByText("Conexão interrompida")).toBeVisible();
  });
});
