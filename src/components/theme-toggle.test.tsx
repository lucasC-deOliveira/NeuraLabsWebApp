import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

const { setTheme, theme } = vi.hoisted(() => ({ setTheme: vi.fn(), theme: { value: "light" } }));

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: theme.value, setTheme }) }));

beforeEach(() => {
  setTheme.mockClear();
  theme.value = "light";
});

describe("ThemeToggle", () => {
  it("switches to dark when currently light", async () => {
    render(<ThemeToggle />);
    await userEvent.click(await screen.findByRole("button", { name: "Ativar tema escuro" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to light when currently dark", async () => {
    theme.value = "dark";
    render(<ThemeToggle />);
    await userEvent.click(await screen.findByRole("button", { name: "Ativar tema claro" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
