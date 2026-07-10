import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphSettingsModal } from "./GraphSettingsModal";
import {
  DEFAULT_PHYSICS_OPTIONS,
  DEFAULT_CLUSTER_OPTIONS,
} from "../services/graph-physics.service";

function setup(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const onOpenChange = vi.fn();
  const onPhysicsModeChange = vi.fn();
  const onFocusDepthChange = vi.fn();
  render(
    <GraphSettingsModal
      open
      onOpenChange={onOpenChange}
      options={DEFAULT_PHYSICS_OPTIONS}
      onChange={onChange}
      physicsMode="default"
      onPhysicsModeChange={onPhysicsModeChange}
      focusDepth={1}
      onFocusDepthChange={onFocusDepthChange}
      {...(overrides as Partial<ComponentProps<typeof GraphSettingsModal>>)}
    />,
  );
  return { onChange, onOpenChange, onPhysicsModeChange, onFocusDepthChange };
}

beforeEach(() => vi.clearAllMocks());

describe("GraphSettingsModal", () => {
  it("shows the title and physics-mode options when open", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Configurações do gráfico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Padrão/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clusters/ })).toBeInTheDocument();
  });

  it("switching to cluster mode changes the mode and loads the cluster defaults", async () => {
    const { onPhysicsModeChange, onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Clusters/ }));
    expect(onPhysicsModeChange).toHaveBeenCalledWith("cluster");
    expect(onChange).toHaveBeenCalledWith(DEFAULT_CLUSTER_OPTIONS);
  });

  it("editing a slider emits a patched options object", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Espalhamento"), { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PHYSICS_OPTIONS, gravitationalConstant: 500 });
  });

  it("hides the advanced physics knobs, keeping only the user-meaningful controls", () => {
    setup();
    expect(screen.getByLabelText("Espalhamento")).toBeInTheDocument();
    expect(screen.getByLabelText("Coesão")).toBeInTheDocument();
    expect(screen.getByLabelText("Espaçamento entre nós")).toBeInTheDocument();
    expect(screen.queryByLabelText("Atrito")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Rigidez das arestas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Força orbital")).not.toBeInTheDocument();
  });

  it("editing the focus depth emits the new depth", () => {
    const { onFocusDepthChange } = setup();
    fireEvent.change(screen.getByLabelText(/Destaque de conexões/), { target: { value: "3" } });
    expect(onFocusDepthChange).toHaveBeenCalledWith(3);
  });

  it("restores defaults and closes", async () => {
    const { onChange, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PHYSICS_OPTIONS });
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the shared controls (no advanced cluster knobs) in cluster mode", () => {
    setup({ physicsMode: "cluster", options: DEFAULT_CLUSTER_OPTIONS });
    expect(screen.getByLabelText("Espalhamento")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Atração de cluster")).not.toBeInTheDocument();
  });
});
