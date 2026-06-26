import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateGraphModal } from "./GenerateGraphModal";
import { planGraphFromText, buildGraphFromPlan } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ planGraphFromText: vi.fn(), buildGraphFromPlan: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(planGraphFromText).mockResolvedValue({ plan: { nodes: [] } });
  vi.mocked(buildGraphFromPlan).mockResolvedValue({
    assunto: "Bio",
    topicos: 2,
    conceitos: 3,
    notas: 1,
    flashcards: 4,
    baralho: null,
  });
});

describe("GenerateGraphModal", () => {
  it("plans then builds the graph from the pasted text", async () => {
    const onGenerated = vi.fn();
    render(<GenerateGraphModal open onOpenChange={vi.fn()} grafoId="g1" onGenerated={onGenerated} />);

    await userEvent.type(screen.getByPlaceholderText(/Cole o texto aqui/), "meu texto");
    await userEvent.click(screen.getByRole("button", { name: /Gerar/ }));

    await waitFor(() => expect(buildGraphFromPlan).toHaveBeenCalled());
    expect(planGraphFromText).toHaveBeenCalledWith("g1", "meu texto");
    expect(buildGraphFromPlan).toHaveBeenCalledWith("g1", "meu texto", { nodes: [] }, expect.any(Boolean));
    expect(onGenerated).toHaveBeenCalled();
  });
});
