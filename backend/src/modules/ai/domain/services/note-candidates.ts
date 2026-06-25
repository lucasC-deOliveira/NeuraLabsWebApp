// Maps the model's raw note objects into note candidates with safe defaults.
// Pure logic.

export interface RawNote {
  titulo?: unknown;
  conteudo?: unknown;
}

export interface NoteCandidate {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[];
}

export function selectNoteCandidates(raw: RawNote[]): NoteCandidate[] {
  return raw.map((n) => ({
    titulo: typeof n?.titulo === 'string' && n.titulo ? n.titulo : 'Nota sem título',
    conteudo: typeof n?.conteudo === 'string' ? n.conteudo : '',
    conceitosPrevistos: [],
  }));
}
