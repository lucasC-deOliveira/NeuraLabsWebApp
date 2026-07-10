import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GraphLoadingScreen } from "./GraphLoadingScreen";

describe("GraphLoadingScreen", () => {
  it("shows both stages with the fetch stage active while loading", () => {
    render(<GraphLoadingScreen phase="loading" />);
    expect(screen.getByText("Carregando o grafo")).toBeInTheDocument();
    expect(screen.getByText("Montando o layout")).toBeInTheDocument();
    // fetch stage is active → its sublabel is visible
    expect(screen.getByText(/Buscando nós/)).toBeInTheDocument();
    expect(screen.queryByText(/Posicionando os nós/)).toBeNull();
  });

  it("activates the layout stage while preparing (covers the post-fetch build)", () => {
    render(<GraphLoadingScreen phase="preparing" />);
    // layout stage is now active → its sublabel shows, fetch sublabel hidden
    expect(screen.getByText(/Posicionando os nós/)).toBeInTheDocument();
    expect(screen.queryByText(/Buscando nós/)).toBeNull();
  });
});
