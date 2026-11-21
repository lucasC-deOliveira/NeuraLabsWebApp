import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { announceVaultStudyChange, openVaultStudyDialog } from "@/lib/vault-study-events";
import { VaultStudySyncPrompt } from "./VaultStudySyncPrompt";
import type { VaultStudyNotice } from "../infra/vault-study-notice";

class FakeVaultNotices {
  notice: VaultStudyNotice | null = {
    folder: "vault", fingerprint: "first", count: 1, kind: "local-reviews",
  };

  readonly inspect = async (): Promise<VaultStudyNotice | null> => this.notice;
}

describe("VaultStudySyncPrompt", () => {
  it("waits until the user leaves settings and rechecks after returning", async () => {
    const notices = new FakeVaultNotices();
    const inspect = vi.fn(notices.inspect);
    const { rerender } = render(<VaultStudySyncPrompt paused inspect={inspect} />);
    expect(inspect).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument();

    rerender(<VaultStudySyncPrompt inspect={inspect} />);
    expect(await screen.findByRole("region", { name: "Alterações para sincronizar" })).toBeVisible();
    rerender(<VaultStudySyncPrompt paused inspect={inspect} />);
    notices.notice = null;
    await waitFor(() => expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument());
    rerender(<VaultStudySyncPrompt inspect={inspect} />);
    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument();
  });

  it("shows the banner only after the last open study dialog closes", async () => {
    const closeDeck = openVaultStudyDialog();
    const closeCard = openVaultStudyDialog();
    try {
      const notices = new FakeVaultNotices();
      const inspect = vi.fn(notices.inspect);
      render(<VaultStudySyncPrompt inspect={inspect} />);
      await act(async () => { announceVaultStudyChange("review"); });
      expect(inspect).not.toHaveBeenCalled();
      await act(async () => { closeDeck(); });
      expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument();
      await act(async () => { closeCard(); });
      expect(await screen.findByRole("region", { name: "Alterações para sincronizar" })).toBeVisible();
    } finally {
      closeDeck();
      closeCard();
    }
  });

  it("defers identical changes and waits for confirmation before synchronizing", async () => {
    const notices = new FakeVaultNotices();
    const synchronize = vi.fn(async () => ({ confirmed: 2, updated: 1, pending: 0 }));
    render(<VaultStudySyncPrompt inspect={notices.inspect} synchronize={synchronize} />);
    expect(await screen.findByRole("region", { name: "Alterações para sincronizar" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Depois" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument());

    await act(async () => { fireEvent(window, new Event("focus")); });
    expect(screen.queryByRole("region", { name: "Alterações para sincronizar" })).not.toBeInTheDocument();
    expect(synchronize).not.toHaveBeenCalled();
    notices.notice = { folder: "vault", fingerprint: "second", count: 2, kind: "local-reviews" };
    announceVaultStudyChange("review");
    expect(await screen.findByText("2 revisões do vault estão prontas para enviar.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Sincronizar agora" }));
    await waitFor(() => expect(synchronize).toHaveBeenCalledWith(notices.notice));
  });

  it("offers explicit linking for a downloaded deck with pending reviews", async () => {
    const notices = new FakeVaultNotices();
    notices.notice = {
      kind: "unlinked-reviews", fingerprint: "unlinked", count: 1,
      folder: "vault", deckId: "deck", accountId: "account", serverUrl: "/api",
    };
    const synchronize = vi.fn(async () => ({ confirmed: 1, updated: 1, pending: 0 }));
    render(<VaultStudySyncPrompt inspect={notices.inspect} synchronize={synchronize} />);
    const link = await screen.findByRole("button", { name: "Vincular e sincronizar" });
    expect(synchronize).not.toHaveBeenCalled();
    fireEvent.click(link);
    await waitFor(() => expect(synchronize).toHaveBeenCalledWith(notices.notice));
  });
});
