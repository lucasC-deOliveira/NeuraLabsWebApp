import { NotaSection } from "./nota-section";

/**
 * Nota — entidade de domínio.
 *
 * Represents a study note created from raw text input.
 * Contains parsed markdown-like content with sections and extracted definitions.
 */

interface NotaProps {
  id: string;
  userId: string;
  titulo: string | null;
  textoBruto: string;
  sections: NotaSection[];
  conceitoIds: string[];
  flashcardIds: string[];
  createdAt: Date;
}

export class Nota {
  private constructor(private props: NotaProps) {}

  static create(rawText: string, userId: string, titulo?: string): Nota {
    return new Nota({
      id: crypto.randomUUID(),
      userId,
      titulo: titulo ?? null,
      textoBruto: rawText,
      sections: [],
      conceitoIds: [],
      flashcardIds: [],
      createdAt: new Date(),
    });
  }

  static restore(props: NotaProps): Nota {
    return new Nota(props);
  }

  // --- Queries ---

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get titulo(): string | null {
    return this.props.titulo;
  }

  get textoBruto(): string {
    return this.props.textoBruto;
  }

  get sections(): ReadonlyArray<NotaSection> {
    return this.props.sections;
  }

  get conceitoIds(): ReadonlyArray<string> {
    return this.props.conceitoIds;
  }

  get flashcardIds(): ReadonlyArray<string> {
    return this.props.flashcardIds;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get preview(): string {
    return this.props.titulo
      ? `# ${this.props.titulo}\n\n${this.props.textoBruto}`
      : this.props.textoBruto;
  }

  // --- Commands ---

  attachSections(sections: NotaSection[]): void {
    this.props.sections = sections;
  }

  linkConcept(conceitoId: string): void {
    if (!this.props.conceitoIds.includes(conceitoId)) {
      this.props.conceitoIds.push(conceitoId);
    }
  }

  generateFlashcard(flashcardId: string): void {
    if (!this.props.flashcardIds.includes(flashcardId)) {
      this.props.flashcardIds.push(flashcardId);
    }
  }

  // --- Invariants ---

  hasContent(): boolean {
    return this.props.textoBruto.trim().length > 0;
  }

  extractTerms(): string[] {
    const terms: string[] = [];
    for (const section of this.props.sections) {
      for (const def of section.definitions) {
        terms.push(def.term);
      }
      if (section.heading && section.heading !== "Nota") {
        terms.push(section.heading);
      }
    }
    return terms;
  }

  toToJSON(): Record<string, unknown> {
    return { ...this.props };
  }
}
