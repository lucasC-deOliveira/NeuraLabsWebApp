import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { buildVaultGuide, initVault, VAULT_GUIDE_FILENAME } from "./vault-guide";
import { PARA_FOLDERS } from "./vault-format";

describe("vault-guide", () => {
  it("o guia cobre formato, operações e relações", () => {
    const g = buildVaultGuide();
    expect(g).toContain("frontmatter");
    expect(g).toContain("relacoes");
    expect(g).toContain("Criar nó");
    expect(g).toContain("Excluir nó");
    // relações geradas a partir das regras de domínio
    expect(g).toContain("CONCEITO → TOPICO");
    expect(g).toContain("PERTENCE_A");
  });

  it("initVault cria as pastas PARA e o AGENTS.md", async () => {
    const vault = await fs.mkdtemp(path.join(os.tmpdir(), "vault-guide-"));
    try {
      await initVault(vault);
      for (const folder of PARA_FOLDERS) {
        const stat = await fs.stat(path.join(vault, folder));
        expect(stat.isDirectory()).toBe(true);
      }
      const guide = await fs.readFile(path.join(vault, VAULT_GUIDE_FILENAME), "utf8");
      expect(guide).toContain("Grafo de Conhecimento");
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });
});
