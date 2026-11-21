import { readFileSync, realpathSync } from "node:fs";
import { readVaultStudy, writeVaultStudy } from "../electron/vault-study-store.js";
import { planFlashcards, readFlashcardSource } from "./vault-flashcard-proposal";

try {
  const [command, folder, draft, confirmation] = process.argv.slice(2);
  if (!folder || !draft || (command !== "preview" && command !== "apply")) {
    throw new Error("Uso: preview <vault> <proposta.json> | apply <vault> <proposta.json> <confirmação>.");
  }
  const root = realpathSync(folder);
  const expected = readVaultStudy(root, root);
  const input: unknown = JSON.parse(readFileSync(draft, "utf8").replace(/^\uFEFF/u, ""));
  const { preview, next } = planFlashcards(expected, input, (id, type) => readFlashcardSource(root, id, type));
  if (command === "apply") {
    if (preview.confirmation !== confirmation) throw new Error("A proposta, a fonte ou o vault mudou. Gere outra prévia.");
    if (!writeVaultStudy(root, { folder: root, expected, next })) throw new Error("O vault mudou durante a gravação. Gere outra prévia.");
  }
  console.log(JSON.stringify({ ...preview, applied: command === "apply" }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
