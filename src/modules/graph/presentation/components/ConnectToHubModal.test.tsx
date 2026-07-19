import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectToHubModal } from "./ConnectToHubModal";

const HUB = { id: "hub", type: "TOPICO", nome: "Grafos" };
const MEMBERS = [
  { id: "c1", type: "CONCEITO" },
  { id: "c2", type: "CONCEITO" },
];

describe("ConnectToHubModal", () => {
  it("connects every member once a relation is picked", async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);
    render(
      <ConnectToHubModal open onOpenChange={vi.fn()} hub={HUB} members={MEMBERS} onConnect={onConnect} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "PERTENCE_A" }));
    await userEvent.click(screen.getByRole("button", { name: /Criar 2 aresta/ }));

    await waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));
    expect(onConnect.mock.calls[0][0]).toEqual([
      { sourceNodeId: "c1", targetNodeId: "hub", tipoRelacao: "PERTENCE_A" },
      { sourceNodeId: "c2", targetNodeId: "hub", tipoRelacao: "PERTENCE_A" },
    ]);
  });

  it("cannot connect before a relation is chosen", () => {
    render(
      <ConnectToHubModal open onOpenChange={vi.fn()} hub={HUB} members={MEMBERS} onConnect={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /Escolha uma relação/ })).toBeDisabled();
  });

  it("warns about members that will be ignored", async () => {
    const members = [...MEMBERS, { id: "b1", type: "BARALHO" }];
    render(
      <ConnectToHubModal open onOpenChange={vi.fn()} hub={HUB} members={members} onConnect={vi.fn()} />,
    );

    // BARALHO não compartilha relação com TOPICO, então não sobra opção comum.
    expect(screen.getByText(/Nenhuma relação serve para todos/)).toBeInTheDocument();
  });

  it("explains instead of showing an empty picker when types are incompatible", () => {
    render(
      <ConnectToHubModal
        open
        onOpenChange={vi.fn()}
        hub={HUB}
        members={[{ id: "b1", type: "BARALHO" }]}
        onConnect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nenhuma relação serve para todos/)).toBeInTheDocument();
  });
});
