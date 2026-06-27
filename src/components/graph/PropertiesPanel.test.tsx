import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertiesPanel } from "./PropertiesPanel";

vi.mock("@/lib/graph-api", () => ({ getNodeDetails: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("@/lib/vault-sync", () => ({ readAllVaultNodes: vi.fn(), graphVaultDir: vi.fn() }));
vi.mock("@/lib/srs-local", () => ({ readSrsLog: vi.fn(() => Promise.resolve({ schedule: {} })) }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const node = {
  id: "n1",
  label: "Mitose",
  group: "CONCEITO",
  dominio: 0.5,
  x: 0,
  y: 0,
  tipoReal: "CONCEITO",
  prioridadeRevisao: 5,
} as never;

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onRemoveFromGraph: vi.fn(),
    onDeleteNode: vi.fn(),
    onFocusNode: vi.fn(),
    onToggleCollapse: vi.fn(),
  };
  render(
    <PropertiesPanel
      selectedNode={node}
      connectedEdges={[]}
      isDark={false}
      isDeleting={false}
      collapsed={false}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe("PropertiesPanel", () => {
  it("renders the selected node label", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Mitose" })).toBeInTheDocument();
  });

  it("triggers permanent deletion from its action", async () => {
    const { onDeleteNode } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Excluir permanentemente/ }));
    expect(onDeleteNode).toHaveBeenCalled();
  });
});
