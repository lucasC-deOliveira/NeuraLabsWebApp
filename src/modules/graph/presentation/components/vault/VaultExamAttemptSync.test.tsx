import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VaultExamAttemptSync } from "./VaultExamAttemptSync";

class FakeLegacyDesktopBridge {
  isDesktop = true;
  vault = {};
}

class FakeEmptyExamDesktopBridge {
  isDesktop = true;
  vault = this;

  async listExamAttempts(): Promise<string[]> {
    return [];
  }
}

afterEach(() => vi.unstubAllGlobals());

it("explains how to reload an Electron process with a legacy preload", async () => {
  vi.stubGlobal("neuralabs", new FakeLegacyDesktopBridge());
  render(<VaultExamAttemptSync directory="vault/graph" graphId="graph" disabled={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Enviar tentativas de prova" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Feche e reabra o NeuraLabs");
});

it("explains how to complete a resumable exam when no attempt is available to send", async () => {
  vi.stubGlobal("neuralabs", new FakeEmptyExamDesktopBridge());
  render(<VaultExamAttemptSync directory="vault/graph" graphId="graph" disabled={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Enviar tentativas de prova" }));
  expect(await screen.findByText(/Nenhuma tentativa concluída/)).toHaveTextContent("Ver resultado");
});
