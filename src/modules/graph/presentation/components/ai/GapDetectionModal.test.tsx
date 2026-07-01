import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GapDetectionModal } from "./GapDetectionModal";
import { suggestGapFill } from "@/lib/ai-api";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ suggestGapFill: vi.fn(), addInsightsToGraph: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const gap = {
  communityA: { nodes: [{ label: "X" }] },
  communityB: { nodes: [{ label: "Y" }] },
  bridgeA: { id: "a", label: "A1" },
  bridgeB: { id: "b", label: "B1" },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(suggestGapFill).mockResolvedValue({ insights: [] });
});

function setup(gaps: unknown[]) {
  render(<GapDetectionModal open onOpenChange={vi.fn()} grafoId="g1" gaps={gaps as never} onAdded={vi.fn()} onHighlightGap={vi.fn()} />);
}

describe("GapDetectionModal", () => {
  it("shows the no-gaps state when the graph is well connected", () => {
    setup([]);
    expect(screen.getByText(/Nenhuma lacuna encontrada/)).toBeInTheDocument();
  });

  it("requests AI suggestions for a structural gap", async () => {
    setup([gap]);
    await userEvent.click(screen.getByRole("button", { name: /Preencher com IA/ }));
    await waitFor(() =>
      expect(suggestGapFill).toHaveBeenCalledWith("g1", { labelsA: ["X"], labelsB: ["Y"], bridgeA: "A1", bridgeB: "B1" }),
    );
  });
});
