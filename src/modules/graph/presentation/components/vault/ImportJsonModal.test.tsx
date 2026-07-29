import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportJsonModal } from "./ImportJsonModal";
import { importGraph } from "@/lib/graph-api";
import { toast } from "sonner";
import { invalidateGraphList } from "../../services/graph-list-cache";
import { forgetCachedGraph } from "../../services/graph-cache";

vi.mock("@/lib/graph-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/graph-api")>()),
  importGraph: vi.fn(() => Promise.resolve({ nodes: 1, edges: 0, reused: 0 })),
}));
vi.mock("../../services/graph-list-cache", () => ({ invalidateGraphList: vi.fn() }));
vi.mock("../../services/graph-cache", () => ({ forgetCachedGraph: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

beforeEach(() => vi.clearAllMocks());

const VALID = '{"nodes":[{"ref":"c1","tipo":"CONCEITO","nome":"HTTP"}],"edges":[]}';

describe("ImportJsonModal", () => {
  it("imports a valid JSON payload and signals success", async () => {
    const onSuccess = vi.fn();
    render(<ImportJsonModal open onOpenChange={vi.fn()} grafoId="g1" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/"nodes"/), { target: { value: VALID } });
    await userEvent.click(screen.getByRole("button", { name: /Importar/ }));

    await waitFor(() => expect(importGraph).toHaveBeenCalled());
    expect(vi.mocked(importGraph).mock.calls[0][0]).toBe("g1");
    expect(onSuccess).toHaveBeenCalled();
    // O conteúdo do grafo mudou (vista descartada) e a lista reflete os novos nós.
    expect(forgetCachedGraph).toHaveBeenCalledWith("g1");
    expect(invalidateGraphList).toHaveBeenCalled();
  });

  it("does not touch the caches when the JSON is invalid", async () => {
    render(<ImportJsonModal open onOpenChange={vi.fn()} grafoId="g1" />);
    fireEvent.change(screen.getByPlaceholderText(/"nodes"/), { target: { value: "not json" } });
    await userEvent.click(screen.getByRole("button", { name: /Importar/ }));

    expect(invalidateGraphList).not.toHaveBeenCalled();
    expect(forgetCachedGraph).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON without importing", async () => {
    render(<ImportJsonModal open onOpenChange={vi.fn()} grafoId="g1" />);
    fireEvent.change(screen.getByPlaceholderText(/"nodes"/), { target: { value: "not json" } });
    await userEvent.click(screen.getByRole("button", { name: /Importar/ }));

    expect(importGraph).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
