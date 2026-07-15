import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardTags } from "./FlashcardTags";
import type { FlashcardConceptTag } from "../../domain/flashcard.types";

function tag(over: Partial<FlashcardConceptTag> = {}): FlashcardConceptTag {
  return { conceito: "Alelos", topico: "Genética", topicoId: "t1", assunto: "Biologia", assuntoId: "a1", ...over };
}

const noop = (): void => {};

describe("FlashcardTags", () => {
  it("renders the connected concepts and their parent topics and subjects", () => {
    render(<FlashcardTags tags={[tag()]} onFilter={noop} />);
    expect(screen.getByText("Biologia")).toBeInTheDocument();
    expect(screen.getByText("Genética")).toBeInTheDocument();
    expect(screen.getByText("Alelos")).toBeInTheDocument();
  });

  it("deduplicates shared parents across multiple connected concepts", () => {
    render(
      <FlashcardTags
        tags={[tag({ conceito: "Alelos" }), tag({ conceito: "Mutação" })]}
        onFilter={noop}
      />,
    );
    expect(screen.getAllByText("Biologia")).toHaveLength(1);
    expect(screen.getAllByText("Genética")).toHaveLength(1);
    expect(screen.getByText("Alelos")).toBeInTheDocument();
    expect(screen.getByText("Mutação")).toBeInTheDocument();
  });

  it("omits empty levels (concept without parents)", () => {
    render(
      <FlashcardTags
        tags={[tag({ conceito: "Solto", topico: "", topicoId: "", assunto: "", assuntoId: "" })]}
        onFilter={noop}
      />,
    );
    expect(screen.getByText("Solto")).toBeInTheDocument();
    expect(screen.queryByText("Biologia")).not.toBeInTheDocument();
  });

  it("filters by subject when its tag is clicked", async () => {
    const onFilter = vi.fn();
    render(<FlashcardTags tags={[tag()]} onFilter={onFilter} />);
    await userEvent.click(screen.getByText("Biologia"));
    expect(onFilter).toHaveBeenCalledWith({ assuntoFilter: "a1", topicoFilter: "" });
  });

  it("filters by topic and its parent subject when a topic tag is clicked", async () => {
    const onFilter = vi.fn();
    render(<FlashcardTags tags={[tag()]} onFilter={onFilter} />);
    await userEvent.click(screen.getByText("Genética"));
    expect(onFilter).toHaveBeenCalledWith({ assuntoFilter: "a1", topicoFilter: "t1" });
  });

  it("searches by name when a concept tag is clicked", async () => {
    const onFilter = vi.fn();
    render(<FlashcardTags tags={[tag()]} onFilter={onFilter} />);
    await userEvent.click(screen.getByText("Alelos"));
    expect(onFilter).toHaveBeenCalledWith({ search: "Alelos" });
  });

  it("keeps a parentless tag unclickable (no id to filter by)", () => {
    render(
      <FlashcardTags
        tags={[tag({ conceito: "Solto", topico: "Orfao", topicoId: "", assunto: "", assuntoId: "" })]}
        onFilter={noop}
      />,
    );
    expect(screen.getByText("Orfao").closest("button")).toBeNull();
  });
});
