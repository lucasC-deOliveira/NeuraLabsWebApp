import { expect, it } from "vitest";
import { findBookCitation } from "./find-book-citation";

it("resolves a quotation when re-exporting the book moves it to a different section", () => {
  expect(findBookCitation(["Early paragraph", "The quoted\npassage"], 0, "The quoted passage")).toBe(1);
  expect(findBookCitation(["Page 1", "Page 2"], 1, "Missing quotation")).toBe(1);
});
