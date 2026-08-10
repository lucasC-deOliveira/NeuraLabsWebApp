import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VaultIssues } from "./VaultIssues";
import type { VaultIssue } from "@/lib/vault-validate";

const erro: VaultIssue = {
  severity: "erro",
  relPath: "Resources/card--f1.md",
  message: "FLASHCARD sem `## Pergunta`",
};
const aviso: VaultIssue = {
  severity: "aviso",
  relPath: "Resources/sla--c1.md",
  message: "CONCEITO sem nenhum flashcard",
};

describe("VaultIssues", () => {
  it("renders nothing when the vault is clean", () => {
    const { container } = render(<VaultIssues issues={[]} pushBloqueado={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("separates the error count from the warning count", () => {
    render(<VaultIssues issues={[erro, aviso]} pushBloqueado={false} />);
    expect(screen.getByText("1 erro(s) e 1 aviso(s) no vault")).toBeInTheDocument();
  });

  it("says only warnings when nothing blocks", () => {
    render(<VaultIssues issues={[aviso]} pushBloqueado={false} />);
    expect(screen.getByText("1 aviso(s) no vault")).toBeInTheDocument();
  });

  it("shows the file and the message so the user can find it", () => {
    render(<VaultIssues issues={[erro]} pushBloqueado={false} />);
    expect(screen.getByText("Resources/card--f1.md")).toBeInTheDocument();
    expect(screen.getByText("FLASHCARD sem `## Pergunta`")).toBeInTheDocument();
  });

  // The user must know the Push did not happen, and that clicking again forces it.
  it("explains that the push was interrupted when it was", () => {
    render(<VaultIssues issues={[erro]} pushBloqueado />);
    expect(screen.getByText(/Push foi interrompido/)).toBeInTheDocument();
  });

  it("stays quiet about the interruption when the push was not blocked", () => {
    render(<VaultIssues issues={[erro]} pushBloqueado={false} />);
    expect(screen.queryByText(/Push foi interrompido/)).not.toBeInTheDocument();
  });

  it("caps the list and reports how many are hidden", () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ ...aviso, relPath: `Resources/n${i}.md` }));
    render(<VaultIssues issues={many} pushBloqueado={false} />);
    expect(screen.getByText("Resources/n9.md")).toBeInTheDocument();
    expect(screen.queryByText("Resources/n10.md")).not.toBeInTheDocument();
    expect(screen.getByText("e mais 4 problema(s).")).toBeInTheDocument();
  });
});
