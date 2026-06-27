import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardStyleProvider, useCardStyle } from "./CardStyleProvider";

function Consumer() {
  const { styleId, setStyleId } = useCardStyle();
  return (
    <div>
      <span data-testid="style">{styleId}</span>
      <button onClick={() => setStyleId("neon")}>neon</button>
    </div>
  );
}

describe("CardStyleProvider", () => {
  it("defaults to the classic style and updates it via the context setter", async () => {
    render(
      <CardStyleProvider>
        <Consumer />
      </CardStyleProvider>,
    );
    expect(screen.getByTestId("style")).toHaveTextContent("classic");
    await userEvent.click(screen.getByRole("button", { name: "neon" }));
    expect(screen.getByTestId("style")).toHaveTextContent("neon");
  });
});
