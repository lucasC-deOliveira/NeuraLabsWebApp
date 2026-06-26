import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LearningPathModal } from "./LearningPathModal";
import { generateLearningPath } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ generateLearningPath: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

beforeEach(() => vi.clearAllMocks());

describe("LearningPathModal", () => {
  it("generates and shows the learning path steps", async () => {
    vi.mocked(generateLearningPath).mockResolvedValue({
      steps: [{ nodeId: "n1", nome: "Mitose", tipo: "CONCEITO", motivo: "base" }],
    });
    render(<LearningPathModal open onOpenChange={vi.fn()} grafoId="g1" />);
    expect(generateLearningPath).toHaveBeenCalledWith("g1");
    expect(await screen.findByText("Mitose")).toBeInTheDocument();
  });

  it("shows the empty state when no steps are produced", async () => {
    vi.mocked(generateLearningPath).mockResolvedValue({ steps: [] });
    render(<LearningPathModal open onOpenChange={vi.fn()} grafoId="g1" />);
    expect(await screen.findByText(/Nenhum passo gerado/)).toBeInTheDocument();
  });
});
