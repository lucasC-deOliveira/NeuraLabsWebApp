import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** Opens the modal and picks a node type from the visual grid. */
async function pickType(type: string): Promise<void> {
  render(<CreateNodeModal open onOpenChange={vi.fn()} grafoId="g1" onSuccess={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: type }));
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: "Criar nó" });
}

describe("CreateNodeModal validation", () => {
  it("does not flag anything before the first submit", async () => {
    await pickType("Assunto");
    expect(screen.queryByText("Digite um nome para o assunto")).not.toBeInTheDocument();
  });

  it("names the selected type in the missing-name message", async () => {
    await pickType("Assunto");
    await userEvent.click(submitButton());
    expect(await screen.findByText("Digite um nome para o assunto")).toBeInTheDocument();
  });

  it("reports both sides of a FLASHCARD at once", async () => {
    await pickType("Flashcard");
    await userEvent.click(submitButton());
    expect(await screen.findByText("Digite a pergunta do flashcard")).toBeInTheDocument();
    expect(screen.getByText("Digite a resposta para o flashcard")).toBeInTheDocument();
  });

  it("asks for title, subtype and content of a NOTA in one pass", async () => {
    await pickType("Nota");
    await userEvent.click(submitButton());
    expect(await screen.findByText("Digite um título para a nota")).toBeInTheDocument();
    expect(screen.getByText("Selecione o subtipo da nota")).toBeInTheDocument();
    expect(screen.getByText("Digite o texto da nota")).toBeInTheDocument();
  });

  it("hides the source field unless the note is a LITERATURA one", async () => {
    await pickType("Nota");
    expect(screen.queryByText("Fonte")).not.toBeInTheDocument();
  });

  it("clears the previous type's errors when the type changes", async () => {
    await pickType("Assunto");
    await userEvent.click(submitButton());
    expect(await screen.findByText("Digite um nome para o assunto")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Flashcard" }));
    expect(screen.queryByText("Digite um nome para o assunto")).not.toBeInTheDocument();
  });
});
