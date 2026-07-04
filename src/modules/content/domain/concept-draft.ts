// Shared staging model for authoring concepts against the hierarchy. The user
// stages new concepts (linked to existing or brand-new topics/subjects) before a
// single persist. Used by both the notes and flashcards manual editors.

export type StagedRelation =
  | { kind: "existing-topic"; topicId: string; topicNome: string; tipoRelacao: string }
  | {
      kind: "new-topic";
      topicTempId: string;
      topicNome: string;
      tipoRelacao: string;
      targetAssuntoIds: string[];
      targetAssuntoNomes: string[];
    };

export interface PendingConcept {
  tempId: string;
  nome: string;
  relsToTopics: Array<{ targetTopicoId: string; tipoRelacao: string }>;
  relsToPendingTopics: Array<{ tempTopicoId: string; tipoRelacao: string }>;
}

export interface PendingTopic {
  tempId: string;
  nome: string;
  relsToAssuntos: Array<{ targetAssuntoId: string; tipoRelacao: string }>;
}

export interface PendingAssunto {
  tempId: string;
  nome: string;
}

/** Distinct new-topic staging entries referenced by a set of staged relations. */
export function collectNewTopics(staged: StagedRelation[]): PendingTopic[] {
  const byId = new Map<string, PendingTopic>();
  for (const r of staged) {
    if (r.kind === "new-topic" && !byId.has(r.topicTempId)) {
      byId.set(r.topicTempId, {
        tempId: r.topicTempId,
        nome: r.topicNome,
        relsToAssuntos: r.targetAssuntoIds.map((aid) => ({ targetAssuntoId: aid, tipoRelacao: r.tipoRelacao })),
      });
    }
  }
  return Array.from(byId.values());
}

export interface BuiltConcept {
  concept: PendingConcept;
  newTopics: PendingTopic[];
}

/**
 * Assembles a PendingConcept (plus any brand-new topics it references) from the
 * staged relations, splitting them into existing-topic and new-topic buckets.
 */
export function buildPendingConcept(nome: string, staged: StagedRelation[], tempId: string): BuiltConcept {
  const relsToTopics = staged
    .filter((r): r is Extract<StagedRelation, { kind: "existing-topic" }> => r.kind === "existing-topic")
    .map((r) => ({ targetTopicoId: r.topicId, tipoRelacao: r.tipoRelacao }));
  const relsToPendingTopics = staged
    .filter((r): r is Extract<StagedRelation, { kind: "new-topic" }> => r.kind === "new-topic")
    .map((r) => ({ tempTopicoId: r.topicTempId, tipoRelacao: r.tipoRelacao }));
  return {
    concept: { tempId, nome, relsToTopics, relsToPendingTopics },
    newTopics: collectNewTopics(staged),
  };
}
