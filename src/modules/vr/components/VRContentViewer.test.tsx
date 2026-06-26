import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VRContentViewer } from "./VRContentViewer";

// VRContentViewer é DOM puro (conteúdo mostrado dentro do painel 3D), com fetch.
vi.mock("@/lib/graph-api", () => ({
  getNodeDetails: vi.fn(() =>
    Promise.resolve({ titulo: "Minha Nota", conteudo: "Texto", subtipo: "DEFINICAO", tipoNota: "PERMANENTE" }),
  ),
  getDeckForStudy: vi.fn(() => Promise.resolve({ titulo: "Deck", cards: [] })),
}));

const nodeOf = (group: string) => ({ id: "n1", label: "Item", group }) as never;

describe("VRContentViewer", () => {
  it("loads a NOTA and closes via the Fechar button", async () => {
    const onClose = vi.fn();
    render(<VRContentViewer node={nodeOf("NOTA")} onClose={onClose} />);
    await userEvent.click(await screen.findByText("Fechar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders a BARALHO without crashing", () => {
    expect(() => render(<VRContentViewer node={nodeOf("BARALHO")} onClose={vi.fn()} />)).not.toThrow();
  });
});
