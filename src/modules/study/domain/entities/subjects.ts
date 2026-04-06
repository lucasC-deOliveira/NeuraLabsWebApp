/**
 * Assunto, Topico, Conceito — domain entities for the subject hierarchy.
 */

interface AssuntoProps {
  id: string;
  nome: string;
  descricao: string | null;
  topicos: Topico[];
}

interface TopicoProps {
  id: string;
  assuntoId: string;
  nome: string;
  descricao: string | null;
  conceitos: Conceito[];
}

interface ConceitoProps {
  id: string;
  topicoId: string;
  nome: string;
  descricao: string | null;
  flashcardCount: number;
}

export class Assunto {
  private readonly props: AssuntoProps;

  private constructor(props: AssuntoProps) {
    this.props = props;
  }

  static create(nome: string, descricao?: string, topicos?: Topico[]): Assunto {
    return new Assunto({
      id: crypto.randomUUID(),
      nome,
      descricao: descricao ?? null,
      topicos: topicos ?? [],
    });
  }

  static restore(props: AssuntoProps): Assunto {
    return new Assunto(props);
  }

  get id(): string { return this.props.id; }
  get nome(): string { return this.props.nome; }
  get descricao(): string | null { return this.props.descricao; }
  get topicos(): ReadonlyArray<Topico> { return this.props.topicos; }

  addTopico(topico: Topico): void {
    this.props.topicos.push(topico);
  }
}

export class Topico {
  private readonly props: TopicoProps;

  private constructor(props: TopicoProps) {
    this.props = props;
  }

  static create(assuntoId: string, nome: string, descricao?: string, conceitos?: Conceito[]): Topico {
    return new Topico({
      id: crypto.randomUUID(),
      assuntoId,
      nome,
      descricao: descricao ?? null,
      conceitos: conceitos ?? [],
    });
  }

  static restore(props: TopicoProps): Topico {
    return new Topico(props);
  }

  get id(): string { return this.props.id; }
  get assuntoId(): string { return this.props.assuntoId; }
  get nome(): string { return this.props.nome; }
  get descricao(): string | null { return this.props.descricao; }
  get conceitos(): ReadonlyArray<Conceito> { return this.props.conceitos; }

  addConceito(conceito: Conceito): void {
    this.props.conceitos.push(conceito);
  }
}

export class Conceito {
  private readonly props: ConceitoProps;

  private constructor(props: ConceitoProps) {
    this.props = props;
  }

  static create(topicoId: string, nome: string, descricao?: string): Conceito {
    return new Conceito({
      id: crypto.randomUUID(),
      topicoId,
      nome,
      descricao: descricao ?? null,
      flashcardCount: 0,
    });
  }

  static restore(props: ConceitoProps): Conceito {
    return new Conceito(props);
  }

  get id(): string { return this.props.id; }
  get topicoId(): string { return this.props.topicoId; }
  get nome(): string { return this.props.nome; }
  get descricao(): string | null { return this.props.descricao; }
  get flashcardCount(): number { return this.props.flashcardCount; }
}
