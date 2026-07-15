import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";
import { getConfigAI } from "@/lib/settings-api";

vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
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

beforeEach(() => vi.clearAllMocks());

describe("SettingsPage", () => {
  it("loads the saved AI config into the form", async () => {
    vi.mocked(getConfigAI).mockResolvedValue({ apiKey: "sk-secret", baseUrl: "http://api", modelo: "gpt-4o" });
    render(<SettingsPage />);
    expect(getConfigAI).toHaveBeenCalled();
    expect(await screen.findByDisplayValue("gpt-4o")).toBeInTheDocument();
  });
});
