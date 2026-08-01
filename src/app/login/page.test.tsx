import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { authApi, ApiError } from "@/lib/api";

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
  return { authApi: { login: vi.fn() }, ApiError };
});
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(() => vi.clearAllMocks());

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Senha"), "secret");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage", () => {
  it("logs in and navigates to the callback url", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ id: "u1", nome: "Ada", email: "a@b.com" });
    render(<LoginPage />);
    await fillAndSubmit();

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ email: "a@b.com", senha: "secret" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows the server error message on a failed login", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, "Email ou senha incorretos"));
    render(<LoginPage />);
    await fillAndSubmit();

    expect(await screen.findByText("Email ou senha incorretos")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
