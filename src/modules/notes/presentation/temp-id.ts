// Temp id generator for staged (not-yet-persisted) assuntos/topicos/concepts.
// Wraps Date.now() in a module function so react-hooks/purity stays happy at the
// call sites.

export function nextTempId(prefix: string, seq: number): string {
  return `${prefix}-${Date.now()}-${seq}`;
}
