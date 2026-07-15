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

  it("builds the trail from the route, ending at the current page", () => {
    renderAt("/baralhos/abc", { title: "Meu baralho" });
    const trail = screen.getByLabelText("Trilha");
    expect(trail).toHaveTextContent("Home");
    expect(trail).toHaveTextContent("Baralhos");
    expect(trail).toHaveTextContent("Meu baralho");
  });

  it("links a crumb to its section", () => {
    renderAt("/baralhos/abc");
    expect(screen.getByRole("link", { name: /Baralhos/ })).toHaveAttribute("href", "/baralhos");
  });

  // O caminho tem de terminar onde você está, como a barra do Explorer — mas a
  // pasta aberta não é um link para si mesma.
  it("shows the section itself at its root", () => {
    renderAt("/baralhos", { title: "Baralhos" });
    const trail = screen.getByLabelText("Trilha");
    expect(trail).toHaveTextContent("Home");
    expect(trail).toHaveTextContent("Baralhos");
    expect(screen.queryByRole("link", { name: /^Baralhos$/ })).not.toBeInTheDocument();
  });

  it("does not link the current page to itself", () => {
    renderAt("/baralhos/abc", { title: "Meu baralho" });
    expect(screen.queryByRole("link", { name: "Meu baralho" })).not.toBeInTheDocument();
  });

  it("shows the dashboard as the root of the path", () => {
    renderAt("/", { title: "NeuraLabs" });
    expect(screen.getByLabelText("Trilha")).toHaveTextContent("NeuraLabs");
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
