import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("lets later tailwind utilities win over earlier conflicting ones (twMerge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
