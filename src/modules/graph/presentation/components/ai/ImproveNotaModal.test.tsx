import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImproveNotaModal } from "./ImproveNotaModal";
import { graphHttp } from "@/modules/graph/infra/http";

vi.mock("@/modules/graph/infra/http", () => ({
  graphHttp: { getNodeDetails: vi.fn(), improveNota: vi.fn(), updateGraphNode: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(graphHttp.getNodeDetails).mockResolvedValue({ titulo: "titulo antigo", conteudo: "corpo antigo" } as never);
  vi.mocked(graphHttp.improveNota).mockResolvedValue({ titulo: "Título Novo", conteudo: "## Corpo novo" });
  vi.mocked(graphHttp.updateGraphNode).mockResolvedValue({ success: true });
});

describe("ImproveNotaModal", () => {
  it("improves the note, previews it, and applies", async () => {
    const onApplied = vi.fn();
    render(<ImproveNotaModal open onOpenChange={vi.fn()} notaId="n1" grafoId="g1" onApplied={onApplied} />);
    expect(await screen.findByText("Estilo Markdown")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Melhorar com IA/ }));

    expect(graphHttp.improveNota).toHaveBeenCalledWith({
      titulo: "titulo antigo",
      conteudo: "corpo antigo",
      operations: ["format", "markdown"],
    });
    expect(await screen.findByText("Título Novo")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(graphHttp.updateGraphNode).toHaveBeenCalledWith(
      "NOTA",
      "n1",
      { titulo: "Título Novo", conteudo: "## Corpo novo" },
      "g1",
    );
    expect(onApplied).toHaveBeenCalled();
  });
});
