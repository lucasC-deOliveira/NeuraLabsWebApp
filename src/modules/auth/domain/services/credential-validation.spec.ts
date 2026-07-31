import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "./credential-validation";

describe("safeCallbackUrl", () => {
  it("keeps same-origin absolute paths", () => {
    expect(safeCallbackUrl("/graph/1")).toBe("/graph/1");
  });

  it("rejects protocol-relative and absolute URLs (open redirect)", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/");
    expect(safeCallbackUrl("https://evil.com")).toBe("/");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/");
  });
});
