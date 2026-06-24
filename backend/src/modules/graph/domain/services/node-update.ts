import { NodeValidationError, UnknownNodeTypeError } from '../errors';
import { NOTA_SUBTIPOS } from './node-creation';

// Editable fields for a node update (only the provided ones are applied).
export interface NodeUpdateData {
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
}

const UPDATABLE_TYPES = new Set([
  'ASSUNTO',
  'TOPICO',
  'CONCEITO',
  'FLASHCARD',
  'NOTA',
  'TEXTO_BRUTO',
]);

// Validates a node update: the type must be editable and, for a NOTA, a provided
// subtype must be valid. Throws a domain error the interface layer maps to PT.
export function assertUpdatableNode(tipoNode: string, data: NodeUpdateData): void {
  if (!UPDATABLE_TYPES.has(tipoNode)) throw new UnknownNodeTypeError(tipoNode);
  if (tipoNode === 'NOTA' && data.subtipo && !NOTA_SUBTIPOS.includes(data.subtipo))
    throw new NodeValidationError('INVALID_NOTE_SUBTYPE');
}
