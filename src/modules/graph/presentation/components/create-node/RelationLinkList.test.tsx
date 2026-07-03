import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RelationLinkList, type LinkRow, type RelationOption } from "./RelationLinkList";

const options: RelationOption[] = [
  { id: "c1", nome: "Mitose" },
  { id: "c2", nome: "Meiose" },
];
const relations = ["DEFINE", "EXPLICA"] as const;

function renderList(links: LinkRow[], onChange = vi.fn()) {
  render(
    <RelationLinkList
      links={links}
      options={options}
      relations={relations}
      onChange={onChange}
      title="Conceitos relacionados"
      emptyMessage="Nenhum conceito no grafo."
      addLabel="Adicionar conceito"
    />,
  );
  return onChange;
}

describe("RelationLinkList", () => {
  it("shows the empty message when there are no options", () => {
    render(
      <RelationLinkList
        links={[]}
        options={[]}
        relations={relations}
        onChange={vi.fn()}
        title="Conceitos relacionados"
        emptyMessage="Nenhum conceito no grafo."
        addLabel="Adicionar conceito"
      />,
    );
    expect(screen.getByText("Nenhum conceito no grafo.")).toBeInTheDocument();
  });

  it("renders one weight input per link row", () => {
    renderList([{ targetId: "c1", relacao: "DEFINE", peso: 1 }]);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("appends a new empty row (first relation, weight 1) when adding", async () => {
    const onChange = renderList([]);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar conceito" }));
    expect(onChange).toHaveBeenCalledWith([{ targetId: "", relacao: "DEFINE", peso: 1 }]);
  });

  it("removes the row when its remove button is clicked", async () => {
    const onChange = renderList([{ targetId: "c1", relacao: "DEFINE", peso: 1 }]);
    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("hides the add button once every option is linked", () => {
    renderList([
      { targetId: "c1", relacao: "DEFINE", peso: 1 },
      { targetId: "c2", relacao: "EXPLICA", peso: 1 },
    ]);
    expect(screen.queryByRole("button", { name: "Adicionar conceito" })).not.toBeInTheDocument();
  });
});
