import { expect, it } from "vitest";
import { bookGraphContextLabel, isPaginatedBook, selectBookPages } from "./book-page-selection";

const pages = Array.from({ length: 7 }, (_, index) => `## Página ${index + 1}\nText`);

it("selects nonconsecutive pages without shifting citation indices", () => {
  expect(selectBookPages(pages, "5, 2–3, 3")).toEqual({
    pages: "2–3, 5", sections: ["", pages[1], pages[2], "", pages[4], "", ""],
  });
});

it("rejects invalid ranges and identifies legacy grouped transcripts", () => {
  expect(selectBookPages(pages, "0, 3")).toBeNull();
  expect(selectBookPages(pages, "6–8")).toBeNull();
  expect(selectBookPages(pages, "5–3")).toBeNull();
  expect(isPaginatedBook(["## Páginas 1–30\nLegacy export"])).toBe(false);
  expect(isPaginatedBook(pages)).toBe(true);
});

it("labels individual pages, selected pages and the entire book distinctly", () => {
  expect(bookGraphContextLabel({ pages: "4" })).toBe("Página 4");
  expect(bookGraphContextLabel({ pages: "2–3, 5" })).toBe("Páginas 2–3, 5");
  expect(bookGraphContextLabel({ pages: null, complete: true })).toBe("Livro inteiro");
});
