/**
 * NotaDefinition — Value Object para definição extraída do texto.
 */

interface NotaDefinitionProps {
  term: string;
  explanation: string;
}

export class NotaDefinition {
  private props: NotaDefinitionProps;

  private constructor(props: NotaDefinitionProps) {
    if (props.term.trim().length === 0) {
      throw new Error("Definition term cannot be empty");
    }
    this.props = props;
  }

  static create(term: string, explanation: string): NotaDefinition {
    return new NotaDefinition({ term: term.trim(), explanation: explanation.trim() });
  }

  get term(): string {
    return this.props.term;
  }

  get explanation(): string {
    return this.props.explanation;
  }

  toDisplay(): string {
    return `${this.props.term}: ${this.props.explanation}`;
  }
}
