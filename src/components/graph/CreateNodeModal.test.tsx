import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateNodeModal } from "./CreateNodeModal";

// God-component de 1838 linhas (alvo nº1 de decomposição): smoke de montagem.
vi.mock("@/lib/ai-api", () => ({ suggestNotaRelations: vi.fn() }));
vi.mock("@/lib/graph-api", () => ({
  addNodeToGraph: vi.fn(),
  createEdge: vi.fn(),
  createBaralhoNode: vi.fn(),
  getAvailableItems: vi.fn(() => Promise.resolve({ flashcards: [], notas: [] })),
  listUserFlashcards: vi.fn(() => Promise.resolve([])),
  addProvaToGraph: vi.fn(),
}));
vi.mock("@/lib/provas-api", () => ({ parseProvaUpload: vi.fn(), createProvaFromParsed: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("CreateNodeModal (smoke)", () => {
  it("mounts the add-node dialog with its controls", () => {
    render(<CreateNodeModal open onOpenChange={vi.fn()} grafoId="g1" onSuccess={vi.fn()} />);
    expect(screen.getByText("Adicionar nós ao grafo")).toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
