// Monta o bundle standalone para o Electron, após `next build`:
//   1. copia .next/static e public para dentro de .next/standalone
//   2. gera um template de banco vazio (schema aplicado) em build/app.db
// Rode com: node scripts/prepare-standalone.mjs
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("✗ .next/standalone não existe. Rode `next build` antes (output: 'standalone').");
  process.exit(1);
}

// 1. estáticos do Next e pasta public (o server.js mínimo não os copia sozinho)
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}
console.log("✓ static e public copiados para o standalone");

// 2. template do banco: vazio, com o schema aplicado, copiado para userData no 1º boot
const buildDir = path.join(root, "build");
mkdirSync(buildDir, { recursive: true });
const templateDb = path.join(buildDir, "app.db");
rmSync(templateDb, { force: true });
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: `file:${templateDb}` },
});
console.log(`✓ template de banco gerado em ${path.relative(root, templateDb)}`);
