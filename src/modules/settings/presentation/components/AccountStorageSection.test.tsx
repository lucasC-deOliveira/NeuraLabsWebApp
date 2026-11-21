import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import type { AccountStorageUsage } from "@contracts/account-storage";
import type { AccountStorageReader } from "../../application/ports/settings.port";
import { AccountStorageSection } from "./AccountStorageSection";

class FakeAccountStorageReader implements AccountStorageReader {
  requests = 0;
  available = true;

  async getStorageUsage(): Promise<AccountStorageUsage> {
    this.requests++;
    if (!this.available) throw new Error("Server unavailable");
    return { totalBytes: 2_500_000, categories: [{ category: "content", bytes: 2_500_000 }] };
  }
}

it("shows an offline error and displays the server estimate when the retry succeeds", async () => {
  const reader = new FakeAccountStorageReader();
  reader.available = false;
  render(<AccountStorageSection reader={reader} signedIn />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível consultar o servidor");
  reader.available = true;
  fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(await screen.findAllByText(/2,5\s+MB/)).toHaveLength(2);
  expect(screen.getByText("Conteúdo e imagens")).toBeInTheDocument();
});

it("does not request usage for a signed-out desktop user", () => {
  const reader = new FakeAccountStorageReader();
  render(<MemoryRouter><AccountStorageSection reader={reader} signedIn={false} /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Entrar no servidor" })).toBeInTheDocument();
  expect(reader.requests).toBe(0);
});
