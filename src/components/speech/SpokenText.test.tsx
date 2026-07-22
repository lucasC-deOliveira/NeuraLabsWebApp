import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpokenText } from "./SpokenText";
import type { SpeechControls } from "./useSpeech";

vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => <>{children}</>,
}));

function fakeSpeech(overrides: Partial<SpeechControls> = {}): SpeechControls {
  return {
    supported: true,
    speakingId: null,
    sentenceIndex: 0,
    toggle: vi.fn(),
    stop: vi.fn(),
    speak: vi.fn(),
    ...overrides,
  };
}

describe("SpokenText", () => {
  it("renders markdown and speaks on click when not reading this id", async () => {
    const speech = fakeSpeech();
    render(<SpokenText speech={speech} id="nota" text="Frase um. Frase dois." />);

    await userEvent.click(screen.getByText(/Frase um/));
    expect(speech.toggle).toHaveBeenCalledWith("nota", "Frase um. Frase dois.");
  });

  it("highlights the active sentence while reading this id", () => {
    const speech = fakeSpeech({ speakingId: "nota", sentenceIndex: 1 });
    const { container } = render(<SpokenText speech={speech} id="nota" text="Frase um. Frase dois." />);

    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(2);
    // A frase 1 (índice 1) está acesa; a 0, apagada.
    expect(spans[1].className).toContain("bg-primary/25");
    expect(spans[0].className).not.toContain("bg-primary/25");
  });
});
