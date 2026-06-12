import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit } from "@/shared/infrastructure/rate-limiter/in-memory-rate-limiter";

// Rate limit por usuário para as rotas de API do grafo.
// A importação por JSON é "tagarela" (cria muitos nós/arestas em rajada, uma
// requisição cada), então o teto é alto de propósito: barra abuso/automação
// descontrolada sem atrapalhar o uso normal nem uma importação grande.
const WINDOW_MS = 60_000; // 1 minuto
const MAX_WRITES = 3000;  // mutações/min por usuário (cobre importações grandes)
const MAX_READS = 600;    // leituras/min por usuário

/**
 * Aplica rate limit por usuário. Retorna uma resposta 429 quando excedido,
 * ou null quando a requisição pode prosseguir.
 *
 *   const limited = await enforceApiRateLimit("graph:write");
 *   if (limited) return limited;
 */
export async function enforceApiRateLimit(
  scope: string,
  kind: "read" | "write" = "write"
): Promise<NextResponse | null> {
  const userId = (await getSessionUserId()) ?? "anon";
  const max = kind === "read" ? MAX_READS : MAX_WRITES;
  const { allowed, retryAfter } = checkRateLimit(`${scope}:${userId}`, {
    windowMs: WINDOW_MS,
    max,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas requisições em pouco tempo. Aguarde um instante e tente novamente." },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
      }
    );
  }
  return null;
}
