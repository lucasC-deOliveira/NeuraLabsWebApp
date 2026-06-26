import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoadmapPanel } from "./RoadmapPanel";

vi.mock("@/lib/ai-api", () => ({ generateLearningPath: vi.fn(() => Promise.resolve({ steps: [] })) }));

const baseProps = {
  grafoId: "g1",
  nodes: [
    { id: "n1", label: "Mitose", group: "CONCEITO", dominio: 0 },
    { id: "n2", label: "Meiose", group: "CONCEITO", dominio: 1 },
  ],
  edges: [{ source: "n1", target: "n2", type: "PREREQUISITO" }],
  onFocusNode: vi.fn(),
};

describe("RoadmapPanel", () => {
  it("renders nothing when closed", () => {
    render(<RoadmapPanel open={false} onClose={vi.fn()} {...baseProps} />);
    expect(screen.queryByText("Roadmap de estudo")).toBeNull();
  });

  it("renders the panel header and the AI-trail tab when open", () => {
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} />);
    expect(screen.getByText("Roadmap de estudo")).toBeInTheDocument();
    expect(screen.getByText("Trilha IA")).toBeInTheDocument();
  });

  it("calls onClose from the header close button", () => {
    const onClose = vi.fn();
    render(<RoadmapPanel open onClose={onClose} {...baseProps} />);
    const header = screen.getByText("Roadmap de estudo").parentElement?.parentElement as HTMLElement;
    fireEvent.click(header.querySelector("button") as HTMLButtonElement);
    expect(onClose).toHaveBeenCalled();
  });
});
