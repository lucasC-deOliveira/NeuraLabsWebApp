import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GraphListPage from "./page";
import { createGrafo, listUserGraphs, type GraphListParams } from "@/lib/graph-api";
import { desktop, isDesktop, type VaultFile } from "@/lib/vault-bridge";
import { VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";

vi.mock("@/lib/graph-api", () => ({
  listUserGraphs: vi.fn(),
  listGraphAssuntos: vi.fn(() => Promise.resolve([])),
  createGrafo: vi.fn(),
  deleteGrafo: vi.fn(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/vault-bridge", () => ({
  isDesktop: vi.fn(() => false),
  desktop: {
    vault: {
      getPath: vi.fn(),
      listGraphFolders: vi.fn(async () => []),
      write: vi.fn(async (_dir: string, files: VaultFile[]) => ({ written: files.length })),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isDesktop).mockReturnValue(false);
});

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 12 });

// A página fixa o MASTER no topo (tipo=raiz) e lista os SUBGRAFOS abaixo. O mock
// separa os dois, como o backend faz: tipo=raiz devolve só o master.
function mockGraphs(master: unknown, subgrafos: unknown[]): void {
  vi.mocked(listUserGraphs).mockImplementation((params?: GraphListParams) =>
    Promise.resolve(page(params?.tipo === "raiz" ? [master] : subgrafos)) as ReturnType<
      typeof listUserGraphs
    >,
  );
}

const master = { id: "master", nome: "Meu Conhecimento", parentGrafoId: null, filhosCount: 2 };

describe("GraphListPage", () => {
  it("creates a local graph with an offline desktop session", async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(desktop.vault.getPath).mockResolvedValue("C:/vault");
    render(<GraphListPage />);

    const name = screen.getByRole("textbox", { name: "Nome do grafo" });
    await userEvent.type(name, "Biologia");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(createGrafo).not.toHaveBeenCalled();
    expect(desktop.vault.write).toHaveBeenCalledWith(
      expect.stringMatching(/^C:\/vault\/\.neuralabs\/graphs\//),
      expect.arrayContaining([expect.objectContaining({ relPath: VAULT_GRAPH_MANIFEST })]),
    );
  });

  it("pins the master graph at the top", async () => {
    mockGraphs(master, []);
    render(<GraphListPage />);
    expect(await screen.findByText("Meu Conhecimento")).toBeInTheDocument();
    expect(screen.getByText("Seu grafo de conhecimento")).toBeInTheDocument();
  });

  // A lista de baixo é só de subgrafos — o master já está fixo acima, não se repete.
  it("lists the subgraphs below the master", async () => {
    mockGraphs(master, [{ id: "s1", nome: "Cálculo", parentGrafoId: "master" }]);
    render(<GraphListPage />);
    expect(await screen.findByText("Cálculo")).toBeInTheDocument();
  });

  it("highlights the highest-weight assunto tag of a subgraph", async () => {
    mockGraphs(master, [
      {
        id: "s1",
        nome: "Grafo",
        parentGrafoId: "master",
        assuntos: [
          { id: "a1", nome: "Direito", peso: 9 },
          { id: "a2", nome: "Português", peso: 1 },
        ],
      },
    ]);
    render(<GraphListPage />);
    const top = await screen.findByTitle("Assunto mais conectado deste grafo");
    expect(top).toHaveTextContent("Direito");
  });
});
