import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVaultWatch } from "./useVaultWatch";
import { isDesktop, desktop } from "@/lib/vault-bridge";

let capturedOnChanged: ((data: { watchId: string; files: { relPath: string; content: string }[] }) => void) | null;

vi.mock("@/lib/vault-bridge", () => ({
  isDesktop: vi.fn(() => true),
  desktop: {
    vault: {
      getPath: vi.fn(() => Promise.resolve("/dir")),
      onChanged: vi.fn((cb) => {
        capturedOnChanged = cb;
        return () => {};
      }),
      watch: vi.fn(() => Promise.resolve({ ok: true })),
      unwatch: vi.fn(() => Promise.resolve({ ok: true })),
    },
  },
}));
vi.mock("@/lib/vault-format", () => ({ parseNode: vi.fn((content: string) => ({ id: content })) }));
vi.mock("@/lib/vault-sync", () => ({
  graphVaultDir: vi.fn(() => "/dir/graph"),
  vaultToGraphNode: vi.fn((vn: { id: string }) => ({ id: vn.id })),
  vaultToGraphEdges: vi.fn(() => [{ source: "a", target: "b" }]),
}));
vi.mock("@/lib/vault-guide", () => ({ VAULT_GUIDE_FILENAME: "AGENTS.md" }));

const baseProps = () => ({
  grafoId: "g1",
  grafoNome: "Bio",
  rawNodes: [],
  setRawNodes: vi.fn(),
  setRawEdges: vi.fn(),
});

beforeEach(() => {
  capturedOnChanged = null;
  vi.clearAllMocks();
});

describe("useVaultWatch", () => {
  it("does nothing on the web (no desktop bridge)", () => {
    vi.mocked(isDesktop).mockReturnValueOnce(false);
    renderHook(() => useVaultWatch(baseProps()));
    expect(desktop.vault.watch).not.toHaveBeenCalled();
  });

  it("watches the graph dir on desktop and applies vault changes (guide file ignored)", async () => {
    const props = baseProps();
    renderHook(() => useVaultWatch(props));

    await waitFor(() => expect(desktop.vault.watch).toHaveBeenCalledWith("/dir/graph", "graph-g1"));
    expect(capturedOnChanged).toBeTypeOf("function");

    capturedOnChanged?.({
      watchId: "graph-g1",
      files: [
        { relPath: "AGENTS.md", content: "GUIDE" },
        { relPath: "Resources/a.md", content: "NODE" },
      ],
    });

    expect(props.setRawNodes).toHaveBeenCalledWith([{ id: "NODE" }]);
    expect(props.setRawEdges).toHaveBeenCalledWith([{ source: "a", target: "b" }]);
  });

  it("ignores change events from a different watchId", async () => {
    const props = baseProps();
    renderHook(() => useVaultWatch(props));
    await waitFor(() => expect(capturedOnChanged).toBeTypeOf("function"));

    capturedOnChanged?.({ watchId: "other", files: [{ relPath: "Resources/a.md", content: "NODE" }] });
    expect(props.setRawNodes).not.toHaveBeenCalled();
  });
});
