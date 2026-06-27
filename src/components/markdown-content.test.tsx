import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("renders markdown headings and paragraphs", () => {
    render(<MarkdownContent>{"# Título\n\nParágrafo de teste"}</MarkdownContent>);
    expect(screen.getByRole("heading", { name: "Título" })).toBeInTheDocument();
    expect(screen.getByText("Parágrafo de teste")).toBeInTheDocument();
  });

  it("keeps safe link urls but strips dangerous schemes (XSS guard)", () => {
    render(<MarkdownContent>{"[ok](https://example.com) [evil](javascript:alert(1))"}</MarkdownContent>);
    expect(screen.getByRole("link", { name: "ok" })).toHaveAttribute("href", "https://example.com");
    // urlTransform devolve "" para esquemas perigosos → nenhum href javascript:
    const links = screen.getAllByRole("link");
    expect(links.some((l) => (l.getAttribute("href") ?? "").startsWith("javascript:"))).toBe(false);
  });
});
