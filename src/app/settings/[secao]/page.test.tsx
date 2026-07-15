import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsSectionPage from "./page";
import { getConfigAI } from "@/lib/settings-api";

const params: { secao: string } = { secao: "ia" };

vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/settings/ia",
  useParams: () => params,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/settings-api", () => ({ getConfigAI: vi.fn(), saveConfigAI: vi.fn() }));
vi.mock("@/lib/vault-bridge", () => ({
  isDesktop: () => false,
  desktop: { claudeCode: { getConfig: vi.fn(() => Promise.resolve({ enabled: false, savedApiConfig: null })) } },
}));
vi.mock("@/components/color-theme-provider", () => ({
  useColorTheme: () => ({ colorTheme: "default", setColorTheme: vi.fn() }),
}));
vi.mock("@/components/flashcard/CardStyleProvider", () => ({
  useCardStyle: () => ({ cardStyle: "default", setCardStyle: vi.fn() }),
}));
vi.mock("@/components/flashcard/FlashcardFace", () => ({ FlashcardFace: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  params.secao = "ia";
});

describe("SettingsSectionPage", () => {
  it("loads the saved AI config into the form", async () => {
    vi.mocked(getConfigAI).mockResolvedValue({ apiKey: "sk-secret", baseUrl: "http://api", modelo: "gpt-4o" });
    render(<SettingsSectionPage />);
    expect(getConfigAI).toHaveBeenCalled();
    expect(await screen.findByDisplayValue("gpt-4o")).toBeInTheDocument();
  });

  it("titles the screen with the section", async () => {
    vi.mocked(getConfigAI).mockResolvedValue({ apiKey: "", baseUrl: "", modelo: "" });
    render(<SettingsSectionPage />);
    expect(await screen.findByRole("heading", { name: "Conexão com IA" })).toBeInTheDocument();
  });

  // Só a seção aberta monta seu estado: abrir Aparência não pode buscar config de IA.
  it("does not load the AI config on another section", () => {
    params.secao = "aparencia";
    render(<SettingsSectionPage />);
    expect(getConfigAI).not.toHaveBeenCalled();
  });

  it("reports an unknown section instead of rendering an empty screen", () => {
    params.secao = "nao-existe";
    render(<SettingsSectionPage />);
    expect(screen.getByText("Seção não encontrada.")).toBeInTheDocument();
  });

  it("reports a desktop-only section as not found in the browser", () => {
    params.secao = "desktop";
    render(<SettingsSectionPage />);
    expect(screen.getByText("Seção não encontrada.")).toBeInTheDocument();
  });
});
