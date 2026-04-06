import { NotaDefinition } from "../value-objects/nota-definition";

/**
 * NotaSection — representa uma seção extraída do texto bruto.
 * Contém heading, conteúdo e definições (Term: Explanation).
 */

interface NotaSectionProps {
  heading: string;
  content: string[];
  definitions: NotaDefinition[];
}

export class NotaSection {
  private props: NotaSectionProps;

  private constructor(props: NotaSectionProps) {
    this.props = props;
  }

  static create(heading: string, content: string[] = [], definitions: NotaDefinition[] = []): NotaSection {
    return new NotaSection({ heading, content, definitions });
  }

  get heading(): string {
    return this.props.heading;
  }

  get content(): ReadonlyArray<string> {
    return this.props.content;
  }

  get definitions(): ReadonlyArray<NotaDefinition> {
    return this.props.definitions;
  }

  addContentLine(line: string): void {
    this.props.content.push(line);
  }

  addDefinition(def: NotaDefinition): void {
    this.props.definitions.push(def);
  }

  hasContent(): boolean {
    return this.props.content.length > 0 || this.props.definitions.length > 0;
  }
}
