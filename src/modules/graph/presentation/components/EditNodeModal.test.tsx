import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditNodeModal, type NodeEditFocus } from "./EditNodeModal";
import { getNodeDetails, updateGraphNode } from "@/lib/graph-api";
import type { GraphNodeEditorPort, NodeDetails } from "../../application/ports/graph-nodes.port";

class PendingNodeEditor implements GraphNodeEditorPort {
  getNodeDetails(): Promise<NodeDetails | null> {
    return new Promise(() => {});
  }

  async updateGraphNode(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

class FakeLocalNodeEditor extends PendingNodeEditor {
  savedName: unknown;

  override async updateGraphNode(
    _group?: string, _id?: string, fields?: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    this.savedName = fields?.nome;
    return { success: true };
  }
}

// Characterization test (safety net for the hexagonal decomposition of this modal
// into use-case + hook + presentational component). Captures the observable
// behavior with the HTTP edge mocked — the port/adapter still delegates to it, so
// these assertions prove behavior was preserved across the move.
// The CONCEITO node path is the simplest form (nome + descrição, no Select).
vi.mock("@/lib/graph-api", () => ({
  getNodeDetails: vi.fn(),
  updateGraphNode: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const node = { id: "n1", group: "CONCEITO", label: "Mitose" };

// true quando `a` aparece antes de `b` na ordem do documento (camada estrutural:
// garante hierarquia/ordem dos elementos sem depender de layout em pixels).
function isBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// JSDOM has the dialog element but does not implement its top-layer methods.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(): void {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(): void {
    this.open = false;
  };
}

describe("EditNodeModal (characterization)", () => {
  it("lists the affected vault graphs before permitting a concept edit", async () => {
    const editor = new FakeLocalNodeEditor();
    const loadImpact = async () => [
      { id: "g1", name: "Biologia" }, { id: "g2", name: "Revisão" },
    ];
    render(
      <EditNodeModal open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={{ nome: "Mitose", descricao: "" }} loadImpact={loadImpact} />,
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(await screen.findByText("Biologia (grafo atual)")).toBeVisible();
    expect(screen.getByText("Revisão")).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("loads the node details into the form when opened", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "Divisão celular" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);

    expect(await screen.findByDisplayValue("Mitose")).toBeInTheDocument();
    expect(getNodeDetails).toHaveBeenCalledWith("CONCEITO", "n1");
    expect(screen.getByDisplayValue("Divisão celular")).toBeInTheDocument();
  });

  it("dismisses the editor if vault details never arrive", async () => {
    const onOpenChange = vi.fn();
    vi.useFakeTimers();
    try {
      render(<EditNodeModal open onOpenChange={onOpenChange} grafoId="g1" node={node} editor={new PendingNodeEditor()} />);
      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
      await act(async () => vi.advanceTimersByTimeAsync(10_000));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getNodeDetails).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("types into the preloaded concept name and saves the new value locally", async () => {
    const editor = new FakeLocalNodeEditor();
    render(
      <EditNodeModal
        open onOpenChange={vi.fn()} grafoId="g1" node={node}
        editor={editor} initialDetails={{ nome: "Mitose offline", descricao: "Descrição local" }}
      />,
    );
    const name = screen.getByDisplayValue("Mitose offline");
    await userEvent.clear(name);
    await userEvent.type(name, "Meiose offline");
    expect(name).toHaveValue("Meiose offline");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(editor.savedName).toBe("Meiose offline");
    expect(getNodeDetails).not.toHaveBeenCalled();
  });

  it("keeps the input and its draft across graph renders", async () => {
    const editor = new FakeLocalNodeEditor();
    const initialDetails = { nome: "Mitose offline", descricao: "" };
    const view = render(
      <EditNodeModal open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor} initialDetails={initialDetails} />,
    );
    const name = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.type(name, " revisada");

    view.rerender(
      <EditNodeModal open onOpenChange={vi.fn()} grafoId="g1" node={{ ...node }} editor={editor} initialDetails={initialDetails} />,
    );
    expect(screen.getByRole("textbox", { name: "Nome" })).toBe(name);
    expect(name).toHaveFocus();
    expect(name).toHaveValue("Mitose offline revisada");
  });

  it("restores the typed draft if the dialog is remounted during the same edit session", async () => {
    const editor = new FakeLocalNodeEditor();
    const draft: Record<string, string> = {};
    const onDraftFieldChange = (name: string, value: string) => { draft[name] = value; };
    const initialDetails = { nome: "Original", descricao: "" };
    const view = render(
      <EditNodeModal key="first" open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={initialDetails} readDraft={() => draft} onDraftFieldChange={onDraftFieldChange} />,
    );
    const name = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(name);
    await userEvent.type(name, "Rascunho");

    view.rerender(
      <EditNodeModal key="second" open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={initialDetails} readDraft={() => draft} />,
    );
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Rascunho");
  });

  it("restores the description focus and caret if the editor is remounted", async () => {
    const editor = new FakeLocalNodeEditor();
    const focusedField: { current: NodeEditFocus | null } = { current: null };
    const draft: Record<string, string> = {};
    const onDraftFieldChange = (name: string, value: string) => { draft[name] = value; };
    const initialDetails = { nome: "Mitose", descricao: "Descrição original" };
    const view = render(
      <EditNodeModal key="first" open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={initialDetails} focusedFieldRef={focusedField} readDraft={() => draft} onDraftFieldChange={onDraftFieldChange} />,
    );
    const description = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Descrição (opcional)" });
    await userEvent.click(description);
    description.setSelectionRange(3, 3);
    await userEvent.keyboard("!");
    expect(focusedField.current).toMatchObject({ name: "descricao", start: 4, end: 4 });

    view.rerender(
      <EditNodeModal key="second" open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={initialDetails} focusedFieldRef={focusedField} readDraft={() => draft} />,
    );
    const restored = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Descrição (opcional)" });
    expect(restored).toHaveFocus();
    expect(restored.selectionStart).toBe(4);
    expect(restored.selectionEnd).toBe(4);
  });

  it("saves the live form value without depending on a React change event", async () => {
    const editor = new FakeLocalNodeEditor();
    render(
      <EditNodeModal open onOpenChange={vi.fn()} grafoId="g1" node={node} editor={editor}
        initialDetails={{ nome: "Before", descricao: "" }} />,
    );
    const name = screen.getByRole<HTMLInputElement>("textbox", { name: "Nome" });
    name.value = "After";
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(editor.savedName).toBe("After");
  });

  it("releases the native dialog before notifying the graph of a saved node", async () => {
    const editor = new FakeLocalNodeEditor();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    render(
      <EditNodeModal open onOpenChange={onOpenChange} onSuccess={onSuccess} grafoId="g1" node={node}
        editor={editor} initialDetails={{ nome: "Mitose", descricao: "" }} />,
    );
    const dialog = screen.getByRole<HTMLDialogElement>("dialog");
    onOpenChange.mockImplementation(() => expect(dialog.open).toBe(false));
    onSuccess.mockImplementation(() => expect(dialog.open).toBe(false));

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("saves edited fields via updateGraphNode, closes, and calls onSuccess", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });
    vi.mocked(updateGraphNode).mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EditNodeModal
        open
        onOpenChange={onOpenChange}
        grafoId="g1"
        node={node}
        onSuccess={onSuccess}
      />,
    );

    const nomeInput = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(nomeInput);
    await userEvent.type(nomeInput, "Meiose");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateGraphNode).toHaveBeenCalled());
    expect(updateGraphNode).toHaveBeenCalledWith(
      "CONCEITO",
      "n1",
      expect.objectContaining({ nome: "Meiose" }),
      "g1",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("keeps the form structure and order stable (structural net)", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "Divisão" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);
    await screen.findByDisplayValue("Mitose");

    expect(screen.getByRole("heading", { name: "Editar nó" })).toBeInTheDocument();
    expect(isBefore(screen.getByText("Nome"), screen.getByText("Descrição (opcional)"))).toBe(true);
    expect(
      isBefore(
        screen.getByRole("button", { name: "Cancelar" }),
        screen.getByRole("button", { name: "Salvar" }),
      ),
    ).toBe(true);
  });

  it("blocks the save when the name is empty and never calls the api", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);

    const nomeInput = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(nomeInput);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(updateGraphNode).not.toHaveBeenCalled();
  });
});
