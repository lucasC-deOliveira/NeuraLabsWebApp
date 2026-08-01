import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { authApi } from "@/lib/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public fieldErrors: Array<{ path: string; message: string }> = [],
    ) {
      super(message);
    }
  }
  return { authApi: { register: vi.fn() }, ApiError };
});
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(() => vi.clearAllMocks());

async function fill({ senha = "secret", confirm = "secret" } = {}) {
  await userEvent.type(screen.getByLabelText("Nome"), "Ada");
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Senha"), senha);
  await userEvent.type(screen.getByLabelText("Confirmar senha"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("RegisterPage", () => {
  it("registers and navigates home", async () => {
    vi.mocked(authApi.register).mockResolvedValue({ id: "u1", nome: "Ada", email: "a@b.com" });
    render(<RegisterPage />);
    await fill();
    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith({ nome: "Ada", email: "a@b.com", senha: "secret" }),
    );
    expect(push).toHaveBeenCalledWith("/");
  });

  it("blocks submission when the passwords do not match", async () => {
    render(<RegisterPage />);
    await fill({ senha: "secret", confirm: "other" });
    expect(screen.getByText("As senhas nao coincidem")).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("lands the server's field error on the field itself, not on the banner", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError(400, "Informe um email válido", [{ path: "email", message: "Informe um email válido" }]),
    );
    render(<RegisterPage />);

    await fill();

    // A mensagem aparece uma vez só — no campo, via FormMessage; o banner fica vazio.
    expect(await screen.findByText("Informe um email válido")).toBeInTheDocument();
    expect(screen.getAllByText("Informe um email válido")).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });
});
