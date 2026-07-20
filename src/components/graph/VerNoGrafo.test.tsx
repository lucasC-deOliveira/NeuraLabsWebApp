import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerNoGrafo } from "./VerNoGrafo";
import { graphsContaining } from "@/lib/graph-api";

const push = vi.fn();
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/graph-api", () => ({ graphsContaining: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("VerNoGrafo", () => {
  it("navigates straight to the graph, focused on the entity, when it is in one graph", async () => {
    vi.mocked(graphsContaining).mockResolvedValue([{ grafoId: "g1", nome: "Redes" }]);
    render(<VerNoGrafo tipo="NOTA" refId="n1" />);

    await userEvent.click(await screen.findByRole("button", { name: /Ver no grafo/ }));

    expect(push).toHaveBeenCalledWith("/graph/g1?focus=n1");
  });

  it("lets the user pick which graph when the entity is in several", async () => {
    vi.mocked(graphsContaining).mockResolvedValue([
      { grafoId: "g1", nome: "Redes" },
      { grafoId: "g2", nome: "Segurança" },
    ]);
    render(<VerNoGrafo tipo="NOTA" refId="n1" />);

    await userEvent.click(await screen.findByRole("button", { name: /Ver no grafo/ }));
    await userEvent.click(await screen.findByText("Segurança"));

    expect(push).toHaveBeenCalledWith("/graph/g2?focus=n1");
  });

  // Entidade fora de qualquer grafo: o botão não deve poluir a tela.
  it("renders nothing when the entity is in no graph", async () => {
    vi.mocked(graphsContaining).mockResolvedValue([]);
    const { container } = render(<VerNoGrafo tipo="NOTA" refId="n1" />);

    await waitFor(() => expect(graphsContaining).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("does not query while the id is still loading", () => {
    render(<VerNoGrafo tipo="PROVA" refId={undefined} />);

    expect(graphsContaining).not.toHaveBeenCalled();
  });
});
