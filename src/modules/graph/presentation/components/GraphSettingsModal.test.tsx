import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphSettingsModal } from "./GraphSettingsModal";
import { DEFAULT_CLUSTER_OPTIONS } from "../services/graph-physics.service";

function setup(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const onOpenChange = vi.fn();
  const onFocusDepthChange = vi.fn();
  render(
    <GraphSettingsModal
      open
      onOpenChange={onOpenChange}
      options={DEFAULT_CLUSTER_OPTIONS}
      onChange={onChange}
      focusDepth={1}
      onFocusDepthChange={onFocusDepthChange}
      {...(overrides as Partial<ComponentProps<typeof GraphSettingsModal>>)}
    />,
  );
  return { onChange, onOpenChange, onFocusDepthChange };
}

beforeEach(() => vi.clearAllMocks());

describe("GraphSettingsModal", () => {
  it("shows the title when open", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Configurações do gráfico" })).toBeInTheDocument();
  });

  it("no longer offers a physics-mode choice (cluster is the only mode)", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Padrão/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clusters/ })).not.toBeInTheDocument();
  });

  it("editing a slider emits a patched options object", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Espalhamento"), { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CLUSTER_OPTIONS, gravitationalConstant: 500 });
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

  it("restores the cluster defaults and closes", async () => {
    const { onChange, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CLUSTER_OPTIONS });
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
