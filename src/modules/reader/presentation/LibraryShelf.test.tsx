import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LibraryShelf } from "./LibraryShelf";

vi.mock("../infra/pdf-reader", () => ({ drawPdfCover: vi.fn(), openLocalPdf: vi.fn() }));

describe("LibraryShelf", () => {
  it("opens the selected book by its vault path", async () => {
    const manual = { path: "Manuais/Manual_de_Redação.pdf", name: "Manual_de_Redação.pdf" };
    const onOpen = vi.fn();
    render(<LibraryShelf files={[manual]} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole("button", { name: "Manual de Redação" }));

    expect(onOpen).toHaveBeenCalledWith(manual);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
