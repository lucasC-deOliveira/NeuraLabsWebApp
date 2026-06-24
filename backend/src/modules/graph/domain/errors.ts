// Graph domain errors with context — the interface layer maps them to HTTP
// responses with user-facing (Portuguese) messages.

export class GraphNodesNotFoundError extends Error {
  constructor() {
    super('One or both nodes were not found in the graph.');
    this.name = 'GraphNodesNotFoundError';
  }
}

export class EdgeNotFoundError extends Error {
  constructor(edgeId: string) {
    super(`Edge not found: "${edgeId}".`);
    this.name = 'EdgeNotFoundError';
  }
}

export class DuplicateEdgeError extends Error {
  constructor() {
    super('An edge with this relation already exists between these nodes.');
    this.name = 'DuplicateEdgeError';
  }
}

export class RelationNotAllowedError extends Error {
  constructor(
    readonly sourceType: string,
    readonly targetType: string,
    readonly relation: string,
    readonly allowed: string[],
  ) {
    super(`Relation "${relation}" not allowed between ${sourceType} and ${targetType}.`);
    this.name = 'RelationNotAllowedError';
  }
}

export class InvalidEdgeWeightError extends Error {
  constructor(readonly value: number) {
    super(`Invalid edge weight: "${value}". Expected a number in (0, 2].`);
    this.name = 'InvalidEdgeWeightError';
  }
}

export class GraphNotFoundError extends Error {
  constructor() {
    super('Graph not found.');
    this.name = 'GraphNotFoundError';
  }
}

export class NodeNotInGraphError extends Error {
  constructor() {
    super('Node not found in the graph.');
    this.name = 'NodeNotInGraphError';
  }
}

export class RootNodeError extends Error {
  constructor() {
    super('The graph root subject cannot be removed; it is deleted with the graph.');
    this.name = 'RootNodeError';
  }
}

export type NodeValidationCode =
  | 'NOTE_TITLE_REQUIRED'
  | 'NOTE_SUBTYPE_REQUIRED'
  | 'LITERATURE_NOTE_SOURCE_REQUIRED'
  | 'RAW_TEXT_REQUIRED'
  | 'INVALID_NOTE_SUBTYPE';

export class NodeValidationError extends Error {
  constructor(readonly code: NodeValidationCode) {
    super(`Invalid node input: ${code}.`);
    this.name = 'NodeValidationError';
  }
}

export class UnknownNodeTypeError extends Error {
  constructor(readonly tipoNode: string) {
    super(`Unknown node type: "${tipoNode}".`);
    this.name = 'UnknownNodeTypeError';
  }
}

export class DeckTitleRequiredError extends Error {
  constructor() {
    super('A deck title is required.');
    this.name = 'DeckTitleRequiredError';
  }
}

export class TooManyFlashcardsError extends Error {
  constructor(readonly max: number) {
    super(`A deck can hold at most ${max} flashcards.`);
    this.name = 'TooManyFlashcardsError';
  }
}

export class FlashcardsNotOwnedError extends Error {
  constructor() {
    super('One or more flashcards do not belong to the user.');
    this.name = 'FlashcardsNotOwnedError';
  }
}

export class ProvaNotFoundError extends Error {
  constructor() {
    super('Exam not found.');
    this.name = 'ProvaNotFoundError';
  }
}

export class ParentGraphNotFoundError extends Error {
  constructor() {
    super('Parent graph not found.');
    this.name = 'ParentGraphNotFoundError';
  }
}

export class InvalidSubgraphRelationError extends Error {
  constructor(readonly relacao: string) {
    super(`Invalid subgraph relation: "${relacao}".`);
    this.name = 'InvalidSubgraphRelationError';
  }
}

export class NoNodesToExtractError extends Error {
  constructor() {
    super('Select at least one node to extract.');
    this.name = 'NoNodesToExtractError';
  }
}

export class NoValidNodesError extends Error {
  constructor() {
    super('No valid nodes were found to extract.');
    this.name = 'NoValidNodesError';
  }
}
