/**
 * SpacedRepetitionData — Value Object com dados de repetição espaçada.
 */

interface SpacedRepetitionProps {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}

export class SpacedRepetitionData {
  private props: SpacedRepetitionProps;

  private constructor(props: SpacedRepetitionProps) {
    this.props = props;
  }

  static create(
    dificuldade: number,
    intervalo: number,
    proximaRevisao: Date,
    ultimaRevisao: Date,
    estagioAprendizado: number,
  ): SpacedRepetitionData {
    return new SpacedRepetitionData({
      dificuldade,
      intervalo,
      proximaRevisao,
      ultimaRevisao,
      estagioAprendizado,
    });
  }

  get dificuldade(): number {
    return this.props.dificuldade;
  }

  get intervalo(): number {
    return this.props.intervalo;
  }

  get proximaRevisao(): Date {
    return this.props.proximaRevisao;
  }

  get ultimaRevisao(): Date {
    return this.props.ultimaRevisao;
  }

  get estagioAprendizado(): number {
    return this.props.estagioAprendizado;
  }

  isDue(): boolean {
    return this.props.proximaRevisao <= new Date();
  }

  isOverdue(): boolean {
    const diffMs = this.props.proximaRevisao.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 0;
  }
}
