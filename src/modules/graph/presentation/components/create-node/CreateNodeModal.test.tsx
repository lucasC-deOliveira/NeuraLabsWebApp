import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateNodeModal } from "./CreateNodeModal";

// Smoke de montagem do modal decomposto (era um god-component de 1838 linhas).
// O adapter delega para @/lib/*, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ suggestNotaRelations: vi.fn() }));
vi.mock("@/lib/graph-api", () => ({
  addNodeToGraph: vi.fn(),
  createBaralhoNode: vi.fn(),
  createEdge: vi.fn(),
  getAvailableItems: vi.fn(() => Promise.resolve({ flashcards: [], notas: [], provas: [] })),
  listUserFlashcards: vi.fn(() => Promise.resolve([])),
  addProvaToGraph: vi.fn(),
}));
vi.mock("@/lib/provas-api", () => ({ parseProvaUpload: vi.fn(), createProvaFromParsed: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe("CreateNodeModal (smoke)", () => {
  it("mounts the add-node dialog with its actions", () => {
    render(<CreateNodeModal open onOpenChange={vi.fn()} grafoId="g1" onSuccess={vi.fn()} />);
    expect(screen.getByText("Adicionar ao grafo")).toBeInTheDocument();
    // Tabs só aparecem para FLASHCARD/NOTA; sem tipo selecionado, o footer age.
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
