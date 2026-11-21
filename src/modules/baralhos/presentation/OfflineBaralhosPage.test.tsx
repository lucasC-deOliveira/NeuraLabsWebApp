import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BaralhoDetail } from "../domain/baralho.types";
import { OfflineBaralhosPage } from "./OfflineBaralhosPage";

class FakeDownloadedLibrary {
  constructor(private readonly decks: BaralhoDetail[] | null) {}

  readonly read = async (): Promise<BaralhoDetail[]> => {
    if (!this.decks) throw new Error("Offline database unavailable");
    return this.decks;
  };
}

describe("OfflineBaralhosPage", () => {
  it("renders downloaded decks with their original questions and answers", async () => {
    const library = new FakeDownloadedLibrary([{
      id: "deck", titulo: "Biology", dataCriacao: new Date(0), origens: [],
      cards: [{
        id: "card", pergunta: "Question", resposta: "Answer", tipo: null,
        conceito: "", conceitosConectados: [], schedule: null,
      }],
    }]);
    render(<MemoryRouter><OfflineBaralhosPage readDecks={library.read} /></MemoryRouter>);
    expect(await screen.findByText("Biology (1)")).toBeInTheDocument();
    expect(screen.getByText("Question")).toBeInTheDocument();
    expect(screen.getByText("Answer")).toBeInTheDocument();
  });

  it("distinguishes a storage error from an empty library", async () => {
    const library = new FakeDownloadedLibrary(null);
    render(<MemoryRouter><OfflineBaralhosPage readDecks={library.read} /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir a biblioteca offline.");
    expect(screen.queryByText(/Nenhum baralho baixado/)).not.toBeInTheDocument();
  });
});
