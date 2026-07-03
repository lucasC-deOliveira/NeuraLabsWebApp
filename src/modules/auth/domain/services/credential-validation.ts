// Pure validation rules for the auth forms. Kept framework-free so both the
// register form and any future auth surface can share them.

const MIN_SENHA_LENGTH = 6;

/**
 * Validates the register form. Returns a user-facing (pt-BR) error message,
 * or `null` when the input is acceptable.
 *
 * @example
 * validateRegistration("Ada", "a@b.com", "secret", "secret"); // → null
 * validateRegistration("Ada", "a@b.com", "secret", "other");  // → "As senhas nao coincidem"
 */
export function validateRegistration(
  nome: string,
  email: string,
  senha: string,
  senhaConfirm: string,
): string | null {
  if (!nome.trim() || !email.trim() || !senha) return "Preencha todos os campos";
  if (senha !== senhaConfirm) return "As senhas nao coincidem";
  if (senha.length < MIN_SENHA_LENGTH) return "Senha deve ter no minimo 6 caracteres";
  return null;
}

/**
 * Sanitizes a post-login redirect target to prevent open-redirect attacks:
 * only same-origin absolute paths pass; anything else falls back to "/".
 */
export function safeCallbackUrl(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}
