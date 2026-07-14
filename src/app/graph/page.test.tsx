import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GraphListPage from "./page";
import { listUserGraphs } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({
  listUserGraphs: vi.fn(),
  listGraphAssuntos: vi.fn(() => Promise.resolve([])),
  createGrafo: vi.fn(),
  deleteGrafo: vi.fn(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("GraphListPage", () => {
  it("loads and lists the user's graphs", async () => {
    vi.mocked(listUserGraphs).mockResolvedValue({
      items: [{ id: "g1", nome: "Meu Grafo" }],
      total: 1,
      page: 1,
      pageSize: 12,
    });
    render(<GraphListPage />);
    expect(listUserGraphs).toHaveBeenCalled();
    expect(await screen.findByText("Meu Grafo")).toBeInTheDocument();
  });
});
