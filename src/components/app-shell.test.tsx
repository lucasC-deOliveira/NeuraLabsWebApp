import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";

vi.mock("@/lib/navigation", () => ({ usePathname: () => "/notes" }));
vi.mock("./sidebar", () => ({ Sidebar: () => <nav data-testid="sidebar" /> }));

describe("AppShell (smoke)", () => {
  it("renders the sidebar and the page content", () => {
    render(
      <AppShell authPaths={["/login", "/register"]}>
        <div>conteúdo da página</div>
      </AppShell>,
    );
    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
