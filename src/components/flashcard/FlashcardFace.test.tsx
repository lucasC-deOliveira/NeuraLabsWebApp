import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("FlashcardFace text-to-speech", () => {
  const spoken: { text: string; lang: string }[] = [];
  let cancels = 0;

  class FakeUtterance {
    text: string;
    lang = "";
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }

  beforeEach(() => {
    spoken.length = 0;
    cancels = 0;
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", {
      speak: (u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang }),
      cancel: () => { cancels++; },
    });
  });

  it("speaks the markdown-stripped text with a guessed language on click", async () => {
    render(<FlashcardFace pergunta="O que é uma **função**?" resposta="R" showAnswer={false} />);

    await userEvent.click(screen.getByRole("button", { name: /Ouvir a pergunta/ }));

    expect(spoken).toEqual([{ text: "O que é uma função?", lang: "pt-BR" }]);
  });

  it("stops when the speaking piece is clicked again (toggle)", async () => {
    render(<FlashcardFace pergunta="Pergunta" resposta="R" showAnswer={false} />);

    await userEvent.click(screen.getByRole("button", { name: /Ouvir a pergunta/ }));
    await userEvent.click(screen.getByRole("button", { name: /Parar leitura/ }));

    expect(spoken).toHaveLength(1);
    expect(cancels).toBeGreaterThanOrEqual(1);
  });

  it("only offers the answer audio once the answer is shown", () => {
    const { rerender } = render(<FlashcardFace pergunta="P" resposta="R" showAnswer={false} />);
    expect(screen.queryByRole("button", { name: /Ouvir a resposta/ })).toBeNull();

    rerender(<FlashcardFace pergunta="P" resposta="R" showAnswer />);
    expect(screen.getByRole("button", { name: /Ouvir a resposta/ })).toBeInTheDocument();
  });
});
