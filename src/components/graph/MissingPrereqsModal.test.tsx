import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MissingPrereqsModal } from "./MissingPrereqsModal";
import { detectMissingPrerequisites } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({
  detectMissingPrerequisites: vi.fn(),
  addMissingPrerequisite: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

beforeEach(() => vi.clearAllMocks());

describe("MissingPrereqsModal", () => {
  it("detects and lists the missing prerequisites", async () => {
    vi.mocked(detectMissingPrerequisites).mockResolvedValue({
      prerequisites: [
        { nome: "Álgebra", tipo: "CONCEITO", motivo: "base necessária", shouldConnectTo: [{ id: "n1", nome: "Cálculo" }] },
      ],
    });
    render(<MissingPrereqsModal open onOpenChange={vi.fn()} grafoId="g1" onAdded={vi.fn()} />);
    expect(detectMissingPrerequisites).toHaveBeenCalledWith("g1");
    expect((await screen.findAllByText("Álgebra")).length).toBeGreaterThan(0);
  });

  it("shows a retry on analysis error", async () => {
    vi.mocked(detectMissingPrerequisites).mockRejectedValue(new Error("falhou"));
    render(<MissingPrereqsModal open onOpenChange={vi.fn()} grafoId="g1" onAdded={vi.fn()} />);
    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
