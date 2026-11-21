import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readVaultStudy, writeVaultStudy } from "../../../../electron/vault-study-store.js";

describe("vault study file", () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "neuralabs-vault-test-"));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it("writes to the chosen vault and preserves the existing graph files", () => {
    const graph = join(folder, "existing.md");
    writeFileSync(graph, "# Existing note");
    expect(readVaultStudy(folder, folder)).toBeNull();
    expect(writeVaultStudy(folder, { folder, expected: null, next: "first" })).toBe(true);
    expect(readVaultStudy(folder, folder)).toBe("first");
    expect(readFileSync(join(folder, ".neuralabs", "study", "NeuraLabs.study.json"), "utf8")).toBe("first");
    expect(readFileSync(graph, "utf8")).toBe("# Existing note");
  });

  it("reads and updates an existing legacy study file without creating a second copy", () => {
    const legacy = join(folder, "NeuraLabs.study.json");
    writeFileSync(legacy, "legacy");
    expect(readVaultStudy(folder, folder)).toBe("legacy");
    expect(writeVaultStudy(folder, { folder, expected: "legacy", next: "edited" })).toBe(true);
    expect(readFileSync(legacy, "utf8")).toBe("edited");
    expect(existsSync(join(folder, ".neuralabs"))).toBe(false);
  });

  it("rejects writes targeting another folder or an outdated snapshot", () => {
    expect(() => writeVaultStudy(folder, { folder: "other", expected: null, next: "changed" })).toThrow();
    expect(writeVaultStudy(folder, { folder, expected: null, next: "first" })).toBe(true);
    expect(writeVaultStudy(folder, { folder, expected: null, next: "changed" })).toBe(false);
    expect(readVaultStudy(folder, folder)).toBe("first");
  });
});
