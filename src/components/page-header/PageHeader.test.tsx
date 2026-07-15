import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PageHeader } from "./PageHeader";
import { PomodoroProvider } from "./PomodoroProvider";
import { Button } from "@/components/ui/button";

function renderAt(pathname: string, props: Partial<Parameters<typeof PageHeader>[0]> = {}): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PomodoroProvider>
        <PageHeader title="Baralhos" {...props} />
      </PomodoroProvider>
    </MemoryRouter>,
  );
}

describe("PageHeader", () => {
  it("shows the page title", () => {
    renderAt("/baralhos");
    expect(screen.getByRole("heading", { name: "Baralhos" })).toBeInTheDocument();
  });

  it("shows the subtitle when given", () => {
    renderAt("/baralhos", { subtitle: "3 baralhos no total" });
    expect(screen.getByText("3 baralhos no total")).toBeInTheDocument();
  });

  it("renders the page actions", () => {
    renderAt("/baralhos", { actions: <Button>Novo baralho</Button> });
    expect(screen.getByRole("button", { name: "Novo baralho" })).toBeInTheDocument();
  });

  it("builds the trail from the route", () => {
    renderAt("/baralhos/abc");
    const trail = screen.getByLabelText("Trilha");
    expect(trail).toHaveTextContent("Home");
    expect(trail).toHaveTextContent("Baralhos");
  });

  it("links a crumb to its section", () => {
    renderAt("/baralhos/abc");
    expect(screen.getByRole("link", { name: /Baralhos/ })).toHaveAttribute("href", "/baralhos");
  });

  it("has no trail on the dashboard", () => {
    renderAt("/");
    expect(screen.queryByLabelText("Trilha")).not.toBeInTheDocument();
  });

  it("offers back inside a section", () => {
    renderAt("/baralhos/abc");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("does not offer back at the root of a section", () => {
    renderAt("/baralhos");
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
  });

  it("carries the pomodoro, hidden until asked", async () => {
    renderAt("/baralhos");
    expect(screen.queryByText("Foco")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTitle("Mostrar o pomodoro"));
    expect(screen.getByText("Foco")).toBeInTheDocument();
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });
});
