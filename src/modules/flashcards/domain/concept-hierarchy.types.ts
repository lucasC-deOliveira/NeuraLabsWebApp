// Flat concept hierarchy (subject → topic → concept) used to populate the
// create/edit dialog's concept dropdown. flashcards-owned; the adapter returns
// the structurally compatible shape from @/lib/content-api.

export interface ConceptHierarchy {
  id: string;
  nome: string;
  topicos: Array<{ id: string; nome: string; conceitos: Array<{ id: string; nome: string }> }>;
}
