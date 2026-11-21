import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installVaultAgentSkills } from "../../electron/vault-agent-skills.js";

let workspace: string;
let vault: string;
let source: { skills: string; tools: string; guide: string };

function writeFixture(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "neuralabs-agent-skills-"));
  vault = join(workspace, "vault");
  source = { skills: join(workspace, "skills"), tools: join(workspace, "tools"), guide: join(workspace, "guide.md") };
  mkdirSync(vault);
  writeFixture(source.guide, "# Vault\n");
  writeFixture(join(source.skills, "neuralabs-graph", "SKILL.md"), "# Graph skill\n");
  writeFixture(join(source.skills, "neuralabs-graph", "references", "proposal.md"), "# Proposal\n");
  writeFixture(join(source.tools, "neuralabs-graph.cjs"), "// graph");
  writeFixture(join(source.tools, "neuralabs-flashcards.cjs"), "// flashcards");
});

afterEach(() => rmSync(workspace, { recursive: true, force: true }));

describe("factory vault agent skills", () => {
  const skill = ".neuralabs/skills/neuralabs-graph/SKILL.md";

  it("creates the default guide with a link and installs references and tools", () => {
    installVaultAgentSkills(vault, source);
    expect(readFileSync(join(vault, "AGENTS.md"), "utf8")).toContain(`[Graph skill](${skill})`);
    expect(readFileSync(join(vault, ".neuralabs/skills/neuralabs-graph/references/proposal.md"), "utf8")).toBe("# Proposal\n");
    expect(readFileSync(join(vault, ".neuralabs/tools/neuralabs-flashcards.cjs"), "utf8")).toBe("// flashcards");
  });

  it("preserves custom content and avoids duplicate links on startup", () => {
    const guide = join(vault, "AGENTS.md");
    writeFixture(guide, "# My notes\n");
    writeFixture(join(vault, skill), "# My instructions\n");
    installVaultAgentSkills(vault, source);
    const first = readFileSync(guide, "utf8");
    installVaultAgentSkills(vault, source);
    expect(first).toContain("# My notes");
    expect(readFileSync(guide, "utf8")).toBe(first);
    expect(readFileSync(join(vault, skill), "utf8")).toBe("# My instructions\n");
  });
});
