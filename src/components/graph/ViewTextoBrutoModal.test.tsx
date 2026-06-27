import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewTextoBrutoModal } from "./ViewTextoBrutoModal";
import { getNodeDetails } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({ getNodeDetails: vi.fn() }));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false }));
vi.mock("@/lib/vault-sync", () => ({ findVaultNode: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("ViewTextoBrutoModal", () => {
  it("loads and renders the raw text with its title", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ titulo: "Fonte X", texto: "Conteúdo bruto" });
    render(<ViewTextoBrutoModal open onOpenChange={vi.fn()} textoId="t1" />);
    expect(getNodeDetails).toHaveBeenCalledWith("TEXTO_BRUTO", "t1");
    expect(await screen.findByText("Conteúdo bruto")).toBeInTheDocument();
    expect(screen.getByText("Fonte X")).toBeInTheDocument();
  });

  it("shows an empty message when there is no content", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ titulo: "X", texto: "" });
    render(<ViewTextoBrutoModal open onOpenChange={vi.fn()} textoId="t1" />);
    expect(await screen.findByText("Nenhum conteúdo disponível.")).toBeInTheDocument();
  });

  it("closes via Fechar", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ titulo: "X", texto: "Y" });
    const onOpenChange = vi.fn();
    render(<ViewTextoBrutoModal open onOpenChange={onOpenChange} textoId="t1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
