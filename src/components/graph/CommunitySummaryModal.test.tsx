import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunitySummaryModal } from "./CommunitySummaryModal";
import { generateCommunitySummary } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ generateCommunitySummary: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  vi.mocked(generateCommunitySummary).mockResolvedValue({ titulo: "Resumão", resumo: "Conteúdo" });
});

function setup(overrides: Record<string, unknown> = {}) {
  const onOpenChange = vi.fn();
  render(
    <CommunitySummaryModal
      open
      onOpenChange={onOpenChange}
      grafoId="g1"
      communityLabel="Cluster X"
      nodeIds={["n1", "n2"]}
      {...overrides}
    />,
  );
  return { onOpenChange };
}

describe("CommunitySummaryModal", () => {
  it("requests and renders the AI summary for the cluster nodes", async () => {
    setup();
    expect(generateCommunitySummary).toHaveBeenCalledWith("g1", ["n1", "n2"]);
    expect(await screen.findByText("Resumão")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("copies the summary to the clipboard", async () => {
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Copiar/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Resumão\n\nConteúdo"));
  });

  it("closes via Fechar", async () => {
    const { onOpenChange } = setup();
    await screen.findByText("Resumão");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
