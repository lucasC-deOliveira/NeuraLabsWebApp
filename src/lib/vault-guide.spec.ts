import { describe, it, expect } from "vitest";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "./vault-guide";
import { RELATION_PAIRS } from "@/modules/graph/domain/services/relation-rules";
import { PARA_FOLDERS } from "./vault-format";

describe("buildVaultGuide", () => {
  const guide = buildVaultGuide();

  it("targets AGENTS.md so Claude Code reads it automatically", () => {
    expect(VAULT_GUIDE_FILENAME).toBe("AGENTS.md");
  });

  it("documents the PARA folder structure", () => {
    for (const folder of PARA_FOLDERS) {
      expect(guide).toContain(folder);
    }
  });

  it("lists every allowed relation pair so invalid edges are not created", () => {
    for (const pair of RELATION_PAIRS) {
      expect(guide).toContain(`**${pair.a} → ${pair.b}**`);
    }
  });

  it("explains the stable-id and node-file conventions", () => {
    expect(guide).toContain("<slug-do-titulo>--<id>.md");
    expect(guide).toContain("não deve mudar");
  });
});
