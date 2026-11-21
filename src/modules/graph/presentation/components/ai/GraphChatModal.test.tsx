import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphChatModal } from "./GraphChatModal";
import { chatWithGraph } from "@/lib/ai-api";
import { MemoryRouter } from "react-router-dom";
import type { VaultChatPort } from "../../../application/ports/vault-chat.port";
import type { VaultChatDocument } from "../../../domain/services/vault-chat-search";
import type { VaultChatResponse } from "@contracts/vault-chat";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ chatWithGraph: vi.fn() }));
vi.mock("@/components/markdown-content", () => ({ MarkdownContent: ({ children }: { children: string }) => children }));

beforeEach(() => vi.clearAllMocks());

class OfflineVaultChat implements VaultChatPort {
  async documents(): Promise<VaultChatDocument[]> {
    return [{ id: "note", graphId: "g1", nome: "Mitose", tipo: "NOTA", noteRole: "PERMANENTE",
      body: "Processo de divisão celular.", linkedIds: [] }];
  }

  async answer(): Promise<VaultChatResponse> {
    throw new Error("Server unavailable");
  }
}

describe("GraphChatModal", () => {
  it("sends a question and shows the user message and the assistant answer", async () => {
    vi.mocked(chatWithGraph).mockResolvedValue({ answer: "É a mitose.", referencedNodes: [] });
    render(<GraphChatModal open onOpenChange={vi.fn()} grafoId="g1" />);

    await userEvent.type(screen.getByPlaceholderText("Pergunte algo sobre seu grafo..."), "Qual o conceito?{Enter}");

    await waitFor(() => expect(chatWithGraph).toHaveBeenCalledWith("g1", "Qual o conceito?", []));
    expect(screen.getByText("Qual o conceito?")).toBeInTheDocument();
    expect(await screen.findByText("É a mitose.")).toBeInTheDocument();
  });

  it("shows expandable vault sources when the model is unavailable", async () => {
    render(<MemoryRouter><GraphChatModal open onOpenChange={vi.fn()} grafoId="g1" vault={new OfflineVaultChat()} /></MemoryRouter>);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo de conteúdo" }), "PERMANENTE");
    await userEvent.type(screen.getByPlaceholderText("Pergunte algo sobre seu grafo..."), "Mitose{Enter}");
    expect(await screen.findByText("Trechos encontrados")).toBeInTheDocument();
    expect(screen.getByText("Processo de divisão celular.")).toBeInTheDocument();
    expect(chatWithGraph).not.toHaveBeenCalled();
  });
});
