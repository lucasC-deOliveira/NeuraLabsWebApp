// Regras puras de auth que não são de formulário. A validação dos formulários
// (login/cadastro) vive nos schemas zod em auth-schemas.ts, consumidos pelo
// react-hook-form na presentation.

/**
 * Sanitizes a post-login redirect target to prevent open-redirect attacks:
 * only same-origin absolute paths pass; anything else falls back to "/".
 */
export function safeCallbackUrl(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}
