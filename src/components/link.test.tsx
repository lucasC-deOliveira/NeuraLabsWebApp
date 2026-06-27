import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Link } from "./link";

describe("Link (next/link compat)", () => {
  it("maps href onto react-router's `to` and renders an anchor", () => {
    render(
      <MemoryRouter>
        <Link href="/notes">Notas</Link>
      </MemoryRouter>,
    );
    const anchor = screen.getByRole("link", { name: "Notas" });
    expect(anchor).toHaveAttribute("href", "/notes");
  });

  it("forwards standard anchor props and ignores next-only props", () => {
    render(
      <MemoryRouter>
        <Link href="/x" prefetch scroll={false} className="nav-link" title="ir">
          X
        </Link>
      </MemoryRouter>,
    );
    const anchor = screen.getByRole("link", { name: "X" });
    expect(anchor).toHaveClass("nav-link");
    expect(anchor).toHaveAttribute("title", "ir");
  });
});
