import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardStyleProvider, useCardStyle } from "./CardStyleProvider";

function Consumer() {
  const { styleId, setStyleId, frameId, setFrameId, setFrameImageUrl } = useCardStyle();
  return (
    <div>
      <span data-testid="style">{styleId}</span>
      <span data-testid="frame">{frameId}</span>
      <button onClick={() => setStyleId("neon")}>neon</button>
      <button onClick={() => setFrameId("gold")}>gold</button>
      <button onClick={() => setFrameId("image")}>image</button>
      <button onClick={() => setFrameImageUrl("https://x.test/f.png")}>set image url</button>
    </div>
  );
}

const renderConsumer = (): void => {
  render(
    <CardStyleProvider>
      <Consumer />
    </CardStyleProvider>,
  );
};

const injectedCss = (): string => document.getElementById("fc-card-style")?.textContent ?? "";

beforeEach(() => {
  localStorage.clear();
  document.getElementById("fc-card-style")?.remove();
});

describe("CardStyleProvider", () => {
  it("defaults to the classic style and updates it via the context setter", async () => {
    renderConsumer();
    expect(screen.getByTestId("style")).toHaveTextContent("classic");
    await userEvent.click(screen.getByRole("button", { name: "neon" }));
    expect(screen.getByTestId("style")).toHaveTextContent("neon");
  });

  it("defaults to no frame", () => {
    renderConsumer();
    expect(screen.getByTestId("frame")).toHaveTextContent("none");
  });

  it("injects the frame css when a frame is picked", async () => {
    renderConsumer();
    expect(injectedCss()).not.toContain(".fc-card");
    await userEvent.click(screen.getByRole("button", { name: "gold" }));
    expect(injectedCss()).toContain(".fc-card");
    expect(injectedCss()).toContain("#6b4f16");
  });

  it("keeps the frame when the style changes, they are independent preferences", async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole("button", { name: "gold" }));
    await userEvent.click(screen.getByRole("button", { name: "neon" }));
    expect(screen.getByTestId("frame")).toHaveTextContent("gold");
    expect(screen.getByTestId("style")).toHaveTextContent("neon");
  });

  it("uses the user image once the image frame has an url", async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole("button", { name: "image" }));
    expect(injectedCss()).not.toContain("background-image");
    await userEvent.click(screen.getByRole("button", { name: "set image url" }));
    expect(injectedCss()).toContain('url("https://x.test/f.png")');
  });

  it("persists the frame choice", async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole("button", { name: "gold" }));
    expect(localStorage.getItem("flashcard-frame")).toBe("gold");
  });

  it("restores the saved frame on mount", () => {
    localStorage.setItem("flashcard-frame", "silver");
    renderConsumer();
    expect(screen.getByTestId("frame")).toHaveTextContent("silver");
  });
});
