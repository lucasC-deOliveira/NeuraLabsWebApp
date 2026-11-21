const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { vaultStudyFile } = require("./vault-paths");

const STUDY_FILE = "NeuraLabs.study.json";

function studyFilePath(currentFolder, expectedFolder) {
  if (!currentFolder || currentFolder !== expectedFolder) {
    throw new Error(`Invalid vault folder "${expectedFolder}". Expected: the selected vault folder`);
  }
  if (!fs.statSync(currentFolder).isDirectory()) {
    throw new Error(`Invalid vault folder "${currentFolder}". Expected: an existing directory`);
  }
  return vaultStudyFile(fs.realpathSync(currentFolder), STUDY_FILE);
}

function readStudyFile(file) {
  try {
    if (!fs.lstatSync(file).isFile()) {
      throw new Error(`Invalid vault study file "${file}". Expected: a regular file`);
    }
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Reads the study snapshot from the configured vault.
 * @example readVaultStudy(config.vaultPath, selectedFolder)
 */
function readVaultStudy(currentFolder, expectedFolder) {
  return readStudyFile(studyFilePath(currentFolder, expectedFolder));
}

/** Publishes a complete snapshot only if the on-disk version still matches.
 * @example writeVaultStudy(config.vaultPath, { folder, expected, next })
 */
function writeVaultStudy(currentFolder, { folder, expected, next }) {
  const file = studyFilePath(currentFolder, folder);
  if (readStudyFile(file) !== expected) return false;
  if (typeof next !== "string") throw new Error(`Invalid snapshot "${typeof next}". Expected: serialized study data`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  replaceVaultFile(file, next);
  return true;
}

/** Commits a complete file before replacing the on-disk vault data.
 * @example replaceVaultFile(logPath, serializedLog)
 */
function replaceVaultFile(file, next) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, next, { encoding: "utf8", flag: "wx", flush: true });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

module.exports = { readVaultStudy, writeVaultStudy, replaceVaultFile };
