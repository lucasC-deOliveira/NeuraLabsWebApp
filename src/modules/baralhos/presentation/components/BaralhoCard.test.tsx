import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BaralhoCard } from "./BaralhoCard";
import type { BaralhoItem } from "../../domain/baralho.types";

function baralho(over: Partial<BaralhoItem> = {}): BaralhoItem {
  return {
    id: "b1",
    titulo: "Biologia",
    totalCards: 3,
    novos: 2,
    aprender: 1,
    revisar: 0,
    dataCriacao: new Date("2026-07-14T12:00:00Z"),
    origens: [],
    ...over,
  };
}

function renderCard(item: BaralhoItem, onStudy = vi.fn(), onDelete = vi.fn()) {
  render(
    <MemoryRouter>
      <BaralhoCard baralho={item} onStudy={onStudy} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return { onStudy, onDelete };
}

describe("BaralhoCard", () => {
  it("shows the title and the card count", () => {
    renderCard(baralho());
    expect(screen.getByText("Biologia")).toBeInTheDocument();
    expect(screen.getByText(/Cartões 3/i)).toBeInTheDocument();
  });

  it("shows the study counters of the deck", () => {
    renderCard(baralho());
    const novos = screen.getByText("Novos").parentElement;
    const aprender = screen.getByText("Aprender").parentElement;
    const revisar = screen.getByText("Revisar").parentElement;
    expect(novos).toHaveTextContent("2");
    expect(aprender).toHaveTextContent("1");
    expect(revisar).toHaveTextContent("0");
  });

  it("links to the deck detail", () => {
    renderCard(baralho());
    expect(screen.getByRole("link")).toHaveAttribute("href", "/baralhos/b1");
  });

  it("shows the graphs the deck came from", () => {
    renderCard(baralho({ origens: [{ grafoId: "g1", nome: "Grafo de Bio" }] }));
    expect(screen.getByText("Grafo de Bio")).toBeInTheDocument();
  });

  it("studies the deck when Estudar is clicked", async () => {
    const { onStudy } = renderCard(baralho());
    await userEvent.click(screen.getByRole("button", { name: /estudar/i }));
    expect(onStudy).toHaveBeenCalledOnce();
  });

  it("cannot study an empty deck", () => {
    renderCard(baralho({ totalCards: 0 }));
    expect(screen.getByRole("button", { name: /estudar/i })).toBeDisabled();
  });

  it("asks to delete the deck", async () => {
    const { onDelete } = renderCard(baralho());
    await userEvent.click(screen.getByTitle("Remover baralho"));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
