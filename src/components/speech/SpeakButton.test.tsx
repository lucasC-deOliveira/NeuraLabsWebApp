import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeakButton } from "./SpeakButton";
import type { SpeechControls } from "./useSpeech";

function fakeSpeech(overrides: Partial<SpeechControls> = {}): SpeechControls {
  return { supported: true, speakingId: null, toggle: vi.fn(), stop: vi.fn(), ...overrides };
}

describe("SpeakButton", () => {
  it("renders a play affordance and speaks on click", async () => {
    const speech = fakeSpeech();
    render(<SpeakButton speech={speech} id="q" text="Olá" label="a pergunta" />);

    const button = screen.getByRole("button", { name: "Ouvir a pergunta" });
    await userEvent.click(button);

    expect(speech.toggle).toHaveBeenCalledWith("q", "Olá");
  });

  it("shows a stop affordance while it is the one speaking", () => {
    render(<SpeakButton speech={fakeSpeech({ speakingId: "q" })} id="q" text="Olá" label="a pergunta" />);
    expect(screen.getByRole("button", { name: "Parar leitura" })).toBeInTheDocument();
  });

  it("renders nothing when audio is unsupported", () => {
    const { container } = render(
      <SpeakButton speech={fakeSpeech({ supported: false })} id="q" text="Olá" label="a pergunta" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
