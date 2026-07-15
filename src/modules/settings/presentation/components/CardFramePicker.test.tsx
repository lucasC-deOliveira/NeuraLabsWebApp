import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardStyleProvider } from "@/components/flashcard/CardStyleProvider";
import { CardFramePicker } from "./CardFramePicker";

const renderPicker = (): void => {
  render(
    <CardStyleProvider>
      <CardFramePicker />
    </CardStyleProvider>,
  );
};

beforeEach(() => {
  localStorage.clear();
  document.getElementById("fc-card-style")?.remove();
});

describe("CardFramePicker", () => {
  it("offers every frame", () => {
    renderPicker();
    for (const name of ["Sem moldura", "Dourada", "Prata", "Real", "Neon", "Imagem"]) {
      expect(screen.getByTitle(name)).toBeInTheDocument();
    }
  });

  it("applies the chosen frame to the cards", async () => {
    renderPicker();
    await userEvent.click(screen.getByTitle("Dourada"));
    expect(localStorage.getItem("flashcard-frame")).toBe("gold");
  });

  it("asks for an image only when the image frame is chosen", async () => {
    renderPicker();
    expect(screen.queryByLabelText("Imagem da moldura")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTitle("Imagem"));
    expect(screen.getByLabelText("Imagem da moldura")).toBeInTheDocument();
  });

  it("warns when the address is refused, instead of silently doing nothing", async () => {
    renderPicker();
    await userEvent.click(screen.getByTitle("Imagem"));
    await userEvent.type(screen.getByLabelText("Imagem da moldura"), "javascript:alert(1)");
    expect(screen.getByText(/Endereço não aceito/)).toBeInTheDocument();
  });

  it("accepts a valid address without warning", async () => {
    renderPicker();
    await userEvent.click(screen.getByTitle("Imagem"));
    await userEvent.type(screen.getByLabelText("Imagem da moldura"), "https://x.test/f.png");
    expect(screen.queryByText(/Endereço não aceito/)).not.toBeInTheDocument();
  });

  it("does not warn on an empty address", async () => {
    renderPicker();
    await userEvent.click(screen.getByTitle("Imagem"));
    expect(screen.queryByText(/Endereço não aceito/)).not.toBeInTheDocument();
  });
});
