import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudyAid } from "./StudyAid";
import { generateStudyAid } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({ generateStudyAid: vi.fn() }));

const card = { pergunta: "Qual a capital da França?", resposta: "Paris", conceito: "Geografia" };

beforeEach(() => vi.clearAllMocks());

describe("StudyAid", () => {
  it("fetches a hint only when asked, then shows it", async () => {
    vi.mocked(generateStudyAid).mockResolvedValue({ texto: "Pense num monumento de ferro." });
    render(<StudyAid mode="hint" card={card} />);

    // Nada é buscado no render: custa tokens, então espera o clique.
    expect(generateStudyAid).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Preciso de uma dica/ }));

    expect(generateStudyAid).toHaveBeenCalledWith("hint", card);
    expect(await screen.findByText("Pense num monumento de ferro.")).toBeInTheDocument();
  });

  it("offers to retry when the model returns nothing", async () => {
    vi.mocked(generateStudyAid).mockResolvedValue({ texto: "" });
    render(<StudyAid mode="mnemonic" card={card} />);

    await userEvent.click(screen.getByRole("button", { name: /Criar um mnemônico/ }));

    expect(await screen.findByText(/tentar de novo/)).toBeInTheDocument();
  });

  it("does not crash the card when the request fails", async () => {
    vi.mocked(generateStudyAid).mockRejectedValue(new Error("offline"));
    render(<StudyAid mode="hint" card={card} />);

    await userEvent.click(screen.getByRole("button", { name: /Preciso de uma dica/ }));

    expect(await screen.findByText(/tentar de novo/)).toBeInTheDocument();
  });
});
