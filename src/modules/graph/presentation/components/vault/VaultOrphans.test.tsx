import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VaultOrphans } from "./VaultOrphans";
import type { VaultOrphan } from "@/lib/vault-sync";

const orphan = (n: number): VaultOrphan => ({
  id: `id-${n}`,
  titulo: `Conceito ${n}`,
  relPath: `Resources/conceito-${n}--id-${n}.md`,
});

describe("VaultOrphans", () => {
  it("renders nothing when there is no orphan", () => {
    const { container } = render(<VaultOrphans orphans={[]} busy={false} onClean={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the orphan files so the user sees what is about to go", () => {
    render(<VaultOrphans orphans={[orphan(1)]} busy={false} onClean={vi.fn()} />);
    expect(screen.getByText("Resources/conceito-1--id-1.md")).toBeInTheDocument();
  });

  // The real case had 19 files; listing all of them overflows the dialog.
  it("caps the list and reports how many are hidden", () => {
    const many = Array.from({ length: 19 }, (_, i) => orphan(i));
    render(<VaultOrphans orphans={many} busy={false} onClean={vi.fn()} />);
    expect(screen.getByText("Resources/conceito-7--id-7.md")).toBeInTheDocument();
    expect(screen.queryByText("Resources/conceito-8--id-8.md")).not.toBeInTheDocument();
    expect(screen.getByText("e mais 11 arquivo(s).")).toBeInTheDocument();
  });

  // Deleting is irreversible, so a single misplaced click must not do it.
  it("does not delete on the first click — it asks first", async () => {
    const onClean = vi.fn();
    render(<VaultOrphans orphans={[orphan(1)]} busy={false} onClean={onClean} />);

    await userEvent.click(screen.getByRole("button", { name: /remover órfãos/i }));
    expect(onClean).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /apagar 1 arquivo/i })).toBeInTheDocument();
  });

  it("deletes only after the confirmation is clicked", async () => {
    const onClean = vi.fn();
    render(<VaultOrphans orphans={[orphan(1)]} busy={false} onClean={onClean} />);

    await userEvent.click(screen.getByRole("button", { name: /remover órfãos/i }));
    await userEvent.click(screen.getByRole("button", { name: /apagar 1 arquivo/i }));
    expect(onClean).toHaveBeenCalledTimes(1);
  });

  it("backs out of the confirmation without deleting", async () => {
    const onClean = vi.fn();
    render(<VaultOrphans orphans={[orphan(1)]} busy={false} onClean={onClean} />);

    await userEvent.click(screen.getByRole("button", { name: /remover órfãos/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClean).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /remover órfãos/i })).toBeInTheDocument();
  });

  it("is disabled while a sync is running", () => {
    render(<VaultOrphans orphans={[orphan(1)]} busy onClean={vi.fn()} />);
    expect(screen.getByRole("button", { name: /remover órfãos/i })).toBeDisabled();
  });
});
