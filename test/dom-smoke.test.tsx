import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Smoke test: prova que o ambiente jsdom + testing-library + jest-dom + transform
// de TSX está funcionando. Pode ser removido quando houver testes de componente reais.
function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}!</p>;
}

describe("dom test environment", () => {
  it("renders a component and matches with jest-dom", () => {
    render(<Greeting name="NeuraLabs" />);
    expect(screen.getByText("Hello, NeuraLabs!")).toBeInTheDocument();
  });
});
