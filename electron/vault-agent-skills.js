const fs = require("node:fs");
const path = require("node:path");
const { validateDirectoryChain } = require("./vault-paths");
const { commitVaultWrites } = require("./vault-shared-para");

const TOOLS = ["neuralabs-graph.cjs", "neuralabs-flashcards.cjs"];

function readInstalledFile(file) {
  try {
    if (!fs.lstatSync(file).isFile()) throw new Error(`Invalid vault file "${file}". Expected a regular file.`);
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function listSkillMarkdown(directory, relative = "") {
  const entries = fs.readdirSync(path.join(directory, relative), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) return listSkillMarkdown(directory, child);
    return entry.isFile() && child.endsWith(".md") ? [child] : [];
  }).sort();
}

function loadSkillPack(source) {
  const skills = fs.readdirSync(source.skills, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^neuralabs-[a-z0-9-]+$/.test(entry.name))
    .map(({ name }) => name).sort();
  const files = skills.flatMap((name) => {
    const directory = path.join(source.skills, name);
    const markdown = listSkillMarkdown(directory);
    if (!markdown.includes("SKILL.md")) throw new Error(`Invalid bundled skill "${name}". Expected SKILL.md.`);
    return markdown.map((relative) => bundledFile(directory, relative, `skills/${name}`));
  });
  return [...files, ...TOOLS.map((name) => bundledFile(source.tools, name, "tools"))];
}

function bundledFile(directory, relative, prefix) {
  const contents = fs.readFileSync(path.join(directory, relative), "utf8");
  return { relative: `.neuralabs/${prefix}/${relative.split(path.sep).join("/")}`, contents };
}

function extendAgentGuide(guide, files) {
  const links = files.filter((file) => file.relative.endsWith("/SKILL.md"))
    .filter(({ relative }) => !guide.includes(`(${relative})`))
    .map(({ relative, contents }) => {
      const title = /^# (.+)$/m.exec(contents)?.[1] ?? relative.split("/")[2];
      return `- [${title}](${relative})`;
    });
  if (links.length === 0) return guide;
  return [guide.trimEnd(), "## Skills do NeuraLabs para agentes externos", links.join("\n"), ""].join("\n\n");
}

/** Installs the bundled agent assets while preserving local customizations.
 * @example installVaultAgentSkills(selectedVault, { skills, tools, guide })
 */
function installVaultAgentSkills(folder, source) {
  const root = fs.realpathSync(folder);
  const files = loadSkillPack(source);
  const writes = files.flatMap(({ relative, contents }) => {
    const target = path.join(root, relative);
    validateDirectoryChain(root, path.dirname(target));
    return readInstalledFile(target) === null ? [{ target, expected: null, next: contents }] : [];
  });
  const target = path.join(root, "AGENTS.md");
  const expected = readInstalledFile(target);
  const guide = expected ?? fs.readFileSync(source.guide, "utf8");
  writes.push({ target, expected, next: extendAgentGuide(guide, files) });
  if (!commitVaultWrites(writes)) throw new Error(`Vault "${root}" changed during skill installation. Expected stable files.`);
}

module.exports = { installVaultAgentSkills };
