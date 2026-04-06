import { Nota } from "../../domain/entities/nota";
import { NotaSection } from "../../domain/entities/nota-section";
import { NotaParser } from "../../domain/services/nota-parser";
import { NotaConceptMatcher } from "../../domain/services/nota-concept-matcher";
import { NotaRepository } from "../../domain/repositories/nota-repository";

interface ConceptData {
  id: string;
  nome: string;
}

export interface CreateNotaInput {
  rawText: string;
  userId: string;
  titulo?: string;
}

export interface CreateNotaOutput {
  notaId: string;
  matchedConcepts: Array<{ term: string; conceitoId: string; conceitoNome: string }>;
}

export class CreateNotaUseCase {
  constructor(
    private notaRepository: NotaRepository,
    private conceptData: ConceptData[],
  ) {}

  async execute(input: CreateNotaInput): Promise<CreateNotaOutput> {
    // 1. Create Nota entity
    const nota = Nota.create(input.rawText, input.userId, input.titulo);

    // 2. Parse raw text into structured sections
    const sections = NotaParser.parse(input.rawText);
    nota.attachSections(sections);

    // 3. Match extracted terms to existing concepts
    const terms = nota.extractTerms();
    const matcher = new NotaConceptMatcher(this.conceptData);
    const matches = matcher.matchAll(terms);

    for (const [term, concept] of matches) {
      if (concept) {
        nota.linkConcept(concept.id);
      }
    }

    // 4. Persist
    await this.notaRepository.save(nota);

    return {
      notaId: nota.id,
      matchedConcepts: Array.from(matches.entries())
        .filter(([, c]) => c !== null)
        .map(([term, concept]) => ({
          term,
          conceitoId: concept!.id,
          conceitoNome: concept!.nome,
        })),
    };
  }
}
