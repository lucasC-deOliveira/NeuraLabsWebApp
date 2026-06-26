import { NodeValidationError, UnknownNodeTypeError } from '../errors';

// Input for creating a graph node. The fields used depend on tipoNode; the
// adapter applies persistence defaults for the ones left undefined.
export interface CreateNodeInput {
  tipoNode: string;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}

// Note content subtypes (orthogonal to tipoNota — the Zettelkasten role).
export const NOTA_SUBTIPOS = [
  'DEFINICAO',
  'EXPLICACAO',
  'EXEMPLO',
  'COMPARACAO',
  'SINTESE',
  'PREREQUISITO',
  'ERRO_COMUM',
  'APLICACAO',
];

const CREATABLE_TYPES = new Set([
  'FLASHCARD',
  'NOTA',
  'TEXTO_BRUTO',
  'ASSUNTO',
  'TOPICO',
  'CONCEITO',
  'BARALHO',
]);

// Validates a node-creation input, throwing a domain error the interface layer
// maps to a user-facing message. Only NOTA and TEXTO_BRUTO carry invariants.
export function assertCreatableNode(input: CreateNodeInput): void {
  if (!CREATABLE_TYPES.has(input.tipoNode)) throw new UnknownNodeTypeError(input.tipoNode);
  if (input.tipoNode === 'NOTA') assertValidNota(input);
  else if (input.tipoNode === 'TEXTO_BRUTO') assertValidTextoBruto(input);
}

function assertValidNota(input: CreateNodeInput): void {
  if (!(input.titulo ?? '').trim()) throw new NodeValidationError('NOTE_TITLE_REQUIRED');
  if (!input.subtipo || !NOTA_SUBTIPOS.includes(input.subtipo))
    throw new NodeValidationError('NOTE_SUBTYPE_REQUIRED');
  if ((input.tipoNota ?? 'PERMANENTE') === 'LITERATURA' && !input.fonte?.trim())
    throw new NodeValidationError('LITERATURE_NOTE_SOURCE_REQUIRED');
}

function assertValidTextoBruto(input: CreateNodeInput): void {
  if (!input.texto?.trim()) throw new NodeValidationError('RAW_TEXT_REQUIRED');
}
