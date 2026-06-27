import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlashcardFace } from "./FlashcardFace";

vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

describe("FlashcardFace", () => {
  it("shows only the question when the answer is hidden", () => {
    render(<FlashcardFace pergunta="O que é mitose?" resposta="Divisão" showAnswer={false} />);
    expect(screen.getByText("O que é mitose?")).toBeInTheDocument();
    expect(screen.queryByText("Divisão")).toBeNull();
  });

  it("reveals the answer and concept when showAnswer is true", () => {
    render(
      <FlashcardFace pergunta="O que é mitose?" resposta="Divisão celular" conceito="Biologia" showAnswer />,
    );
    expect(screen.getByText("Divisão celular")).toBeInTheDocument();
    expect(screen.getByText(/Conceito: Biologia/)).toBeInTheDocument();
  });
});
