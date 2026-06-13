// Monta o bundle standalone para o Electron, após `next build`:
//   copia .next/static e public para dentro de .next/standalone
// (o server.js mínimo não os copia sozinho). No modelo novo o app é thin client
// — não há banco local, então nenhum template de DB é gerado.
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("✗ .next/standalone não existe. Rode `next build` antes (output: 'standalone').");
  process.exit(1);
}

cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}
console.log("✓ static e public copiados para o standalone");
