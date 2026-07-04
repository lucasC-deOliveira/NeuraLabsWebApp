// Flattens the concept hierarchy into a name-sorted option list for the dialog.
import type { ConceptHierarchy } from "../concept-hierarchy.types";
import type { ConceptOption } from "../flashcard.types";

function optionsOfSubject(subject: ConceptHierarchy): ConceptOption[] {
  return subject.topicos.flatMap((topico) =>
    topico.conceitos.map((conceito) => ({
      id: conceito.id,
      nome: conceito.nome,
      topicoNome: topico.nome,
      assuntoNome: subject.nome,
    })),
  );
}

/** All concepts across the hierarchy, sorted by name. Pure (no I/O). */
export function flattenConceptOptions(hierarchy: ConceptHierarchy[]): ConceptOption[] {
  return hierarchy.flatMap(optionsOfSubject).sort((a, b) => a.nome.localeCompare(b.nome));
}
