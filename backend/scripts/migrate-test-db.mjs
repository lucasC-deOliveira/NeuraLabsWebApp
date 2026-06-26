// Aplica as migrations do Prisma no banco de TESTE (lendo DATABASE_URL do .env.test).
// O banco em si deve existir antes (criação one-time):
//   docker exec flashcard-app-postgres-1 psql -U neuralabs -d neuralabs -c "CREATE DATABASE neuralabs_test;"
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.test', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL ausente em .env.test');
  process.exit(1);
}

console.log('Aplicando migrations no banco de teste…');
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
});
