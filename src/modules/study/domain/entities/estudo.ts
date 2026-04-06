/**
 * SessaoEstudo — entidade de domínio do estudo.
 */

export interface RevisaoInput {
  flashcardId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
}

interface SessaoEstudoProps {
  id: string;
  userId: string;
  dataInicio: Date;
  dataFim: Date | null;
  revisoes: RevisaoInput[];
}

export class SessaoEstudo {
  private readonly props: SessaoEstudoProps;

  private constructor(props: SessaoEstudoProps) {
    this.props = props;
  }

  static create(userId: string): SessaoEstudo {
    return new SessaoEstudo({
      id: crypto.randomUUID(),
      userId,
      dataInicio: new Date(),
      dataFim: null,
      revisoes: [],
    });
  }

  static restore(props: SessaoEstudoProps): SessaoEstudo {
    return new SessaoEstudo(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get dataInicio(): Date {
    return this.props.dataInicio;
  }

  get dataFim(): Date | null {
    return this.props.dataFim;
  }

  get revisoes(): ReadonlyArray<RevisaoInput> {
    return this.props.revisoes;
  }

  isActive(): boolean {
    return this.props.dataFim === null;
  }

  addRevisao(revisao: RevisaoInput): void {
    this.props.revisoes.push(revisao);
  }

  end(): void {
    this.props.dataFim = new Date();
  }

  getStats(): {
    totalReviews: number;
    correctCount: number;
    incorrectCount: number;
    avgConfidence: number;
  } {
    const totalReviews = this.props.revisoes.length;
    const correctCount = this.props.revisoes.filter((r) => r.acertou).length;
    const incorrectCount = totalReviews - correctCount;
    const avgConfidence =
      totalReviews > 0
        ? this.props.revisoes.reduce((sum, r) => sum + r.nivelConfianca, 0) / totalReviews
        : 0;

    return { totalReviews, correctCount, incorrectCount, avgConfidence: Math.round(avgConfidence * 100) / 100 };
  }
}
