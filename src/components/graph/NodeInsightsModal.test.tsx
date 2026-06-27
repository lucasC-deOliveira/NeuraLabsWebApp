import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeInsightsModal } from "./NodeInsightsModal";
import { generateNodeInsights, addInsightsToGraph } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ generateNodeInsights: vi.fn(), addInsightsToGraph: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

const insight = {
  categoria: "Relacionado",
  titulo: "Insight 1",
  descricao: "Descrição",
  tipoNo: "CONCEITO",
  relacao: "RELACIONADO",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateNodeInsights).mockResolvedValue({ nodeNome: "Mitose", nodeTipo: "CONCEITO", insights: [insight] });
  vi.mocked(addInsightsToGraph).mockResolvedValue({ added: 1 });
});

describe("NodeInsightsModal", () => {
  it("generates insights, adds the selected ones and notifies", async () => {
    const onAdded = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <NodeInsightsModal open onOpenChange={onOpenChange} grafoId="g1" nodeId="n1" nodeLabel="Mitose" onAdded={onAdded} />,
    );

    expect(generateNodeInsights).toHaveBeenCalledWith("g1", "n1");
    await userEvent.click(await screen.findByRole("button", { name: /Insight 1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Adicionar ao grafo/ }));

    await waitFor(() => expect(addInsightsToGraph).toHaveBeenCalledWith("g1", "n1", [insight]));
    expect(onAdded).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows an empty message when the AI returns no insights", async () => {
    vi.mocked(generateNodeInsights).mockResolvedValue({ nodeNome: "M", nodeTipo: "CONCEITO", insights: [] });
    render(<NodeInsightsModal open onOpenChange={vi.fn()} grafoId="g1" nodeId="n1" />);
    expect(await screen.findByText(/não encontrou insights/)).toBeInTheDocument();
  });
});
