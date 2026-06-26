import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoLinkModal } from "./AutoLinkModal";
import { autoLinkGraph, applyAutoLink } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ autoLinkGraph: vi.fn(), applyAutoLink: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const suggestion = {
  sourceId: "a",
  targetId: "b",
  sourceNome: "Mitose",
  targetNome: "Meiose",
  relacao: "RELACIONADO",
  motivo: "Conceitos relacionados",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoLinkGraph).mockResolvedValue({ suggestions: [suggestion] });
  vi.mocked(applyAutoLink).mockResolvedValue({ added: 1 });
});

describe("AutoLinkModal", () => {
  it("loads suggestions on open and applies the selected ones", async () => {
    const onApplied = vi.fn();
    const onOpenChange = vi.fn();
    render(<AutoLinkModal open onOpenChange={onOpenChange} grafoId="g1" onApplied={onApplied} />);

    expect(autoLinkGraph).toHaveBeenCalledWith("g1");
    await userEvent.click(await screen.findByRole("button", { name: /Adicionar selecionadas/ }));

    await waitFor(() =>
      expect(applyAutoLink).toHaveBeenCalledWith("g1", [
        { sourceId: "a", targetId: "b", relacao: "RELACIONADO" },
      ]),
    );
    expect(onApplied).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows an error state when the analysis fails", async () => {
    vi.mocked(autoLinkGraph).mockRejectedValue(new Error("falhou"));
    render(<AutoLinkModal open onOpenChange={vi.fn()} grafoId="g1" onApplied={vi.fn()} />);
    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
