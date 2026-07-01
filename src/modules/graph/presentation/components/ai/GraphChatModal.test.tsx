import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphChatModal } from "./GraphChatModal";
import { chatWithGraph } from "@/lib/ai-api";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ chatWithGraph: vi.fn() }));
vi.mock("@/components/markdown-content", () => ({ MarkdownContent: ({ children }: { children: string }) => children }));

beforeEach(() => vi.clearAllMocks());

describe("GraphChatModal", () => {
  it("sends a question and shows the user message and the assistant answer", async () => {
    vi.mocked(chatWithGraph).mockResolvedValue({ answer: "É a mitose.", referencedNodes: [] });
    render(<GraphChatModal open onOpenChange={vi.fn()} grafoId="g1" />);

    await userEvent.type(screen.getByPlaceholderText("Pergunte algo sobre seu grafo..."), "Qual o conceito?{Enter}");

    await waitFor(() => expect(chatWithGraph).toHaveBeenCalledWith("g1", "Qual o conceito?", []));
    expect(screen.getByText("Qual o conceito?")).toBeInTheDocument();
    expect(await screen.findByText("É a mitose.")).toBeInTheDocument();
  });
});
