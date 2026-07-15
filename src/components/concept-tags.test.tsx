import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConceptTags, type ConceptTagItem } from "./concept-tags";

function tag(over: Partial<ConceptTagItem> = {}): ConceptTagItem {
  return {
    conceito: "Alelos",
    topico: "Genética",
    topicoId: "t1",
    assunto: "Biologia",
    assuntoId: "a1",
    ...over,
  };
}

const noop = (): void => {};

describe("ConceptTags", () => {
  it("renders the connected concepts and their parent topics and subjects", () => {
    render(<ConceptTags tags={[tag()]} onSelect={noop} />);
    expect(screen.getByText("Biologia")).toBeInTheDocument();
    expect(screen.getByText("Genética")).toBeInTheDocument();
    expect(screen.getByText("Alelos")).toBeInTheDocument();
  });

  it("deduplicates shared parents across multiple connected concepts", () => {
    render(
      <ConceptTags
        tags={[tag({ conceito: "Alelos" }), tag({ conceito: "Mutação" })]}
        onSelect={noop}
      />,
    );
    expect(screen.getAllByText("Biologia")).toHaveLength(1);
    expect(screen.getAllByText("Genética")).toHaveLength(1);
    expect(screen.getByText("Alelos")).toBeInTheDocument();
    expect(screen.getByText("Mutação")).toBeInTheDocument();
  });

  it("omits empty levels (concept without parents)", () => {
    render(
      <ConceptTags
        tags={[tag({ conceito: "Solto", topico: "", topicoId: "", assunto: "", assuntoId: "" })]}
        onSelect={noop}
      />,
    );
    expect(screen.getByText("Solto")).toBeInTheDocument();
    expect(screen.queryByText("Biologia")).not.toBeInTheDocument();
  });

  it("reports the subject when its tag is clicked", async () => {
    const onSelect = vi.fn();
    render(<ConceptTags tags={[tag()]} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Biologia"));
    expect(onSelect).toHaveBeenCalledWith({ assuntoId: "a1" });
  });

  it("reports the topic with its parent subject, so the page can filter both", async () => {
    const onSelect = vi.fn();
    render(<ConceptTags tags={[tag()]} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Genética"));
    expect(onSelect).toHaveBeenCalledWith({ assuntoId: "a1", topicoId: "t1" });
  });

  it("reports the concept by name", async () => {
    const onSelect = vi.fn();
    render(<ConceptTags tags={[tag()]} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Alelos"));
    expect(onSelect).toHaveBeenCalledWith({ conceito: "Alelos" });
  });

  it("keeps a parentless tag unclickable (no id to filter by)", () => {
    render(
      <ConceptTags
        tags={[tag({ conceito: "Solto", topico: "Orfao", topicoId: "", assunto: "", assuntoId: "" })]}
        onSelect={noop}
      />,
    );
    expect(screen.getByText("Orfao").closest("button")).toBeNull();
  });
});
