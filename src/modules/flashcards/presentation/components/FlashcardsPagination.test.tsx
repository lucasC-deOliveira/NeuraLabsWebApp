import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardsPagination } from "./FlashcardsPagination";

describe("FlashcardsPagination", () => {
  it("renders nothing when there is a single page", () => {
    const { container } = render(
      <FlashcardsPagination page={1} totalPages={1} onPage={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current page and advances on next", () => {
    const onPage = vi.fn();
    render(<FlashcardsPagination page={2} totalPages={4} onPage={onPage} />);
    expect(screen.getByText("Página 2 de 4")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Próxima"));
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(
      <FlashcardsPagination page={1} totalPages={3} onPage={vi.fn()} />,
    );
    expect(screen.getByText("Anterior").closest("button")).toBeDisabled();
    rerender(<FlashcardsPagination page={3} totalPages={3} onPage={vi.fn()} />);
    expect(screen.getByText("Próxima").closest("button")).toBeDisabled();
  });
});
