import { SpacedRepetitionData } from "../value-objects/flashcard-spaced-data";

/**
 * Flashcard — entidade de domínio.
 *
 * Represents a study flashcard with question/answer and optional spaced repetition data.
 */

interface FlashcardProps {
  id: string;
  userId: string;
  pergunta: string;
  resposta: string;
  // null quando o flashcard não está associado a um conceito (ex.: criado via importação)
  conceitoId: string | null;
  conceitoNome: string | null;
  spacedRepetition: SpacedRepetitionData | null;
  dataCriacao: Date;
}

export class Flashcard {
  private constructor(private props: FlashcardProps) {}

  static create(
    pergunta: string,
    resposta: string,
    conceitoId: string | null,
    conceitoNome: string | null,
    userId: string,
  ): Flashcard {
    if (!pergunta.trim()) throw new Error("Flashcard pergunta cannot be empty");
    if (!resposta.trim()) throw new Error("Flashcard resposta cannot be empty");

    return new Flashcard({
      id: crypto.randomUUID(),
      userId,
      pergunta: pergunta.trim(),
      resposta: resposta.trim(),
      conceitoId,
      conceitoNome,
      spacedRepetition: null,
      dataCriacao: new Date(),
    });
  }

  static restore(props: FlashcardProps): Flashcard {
    return new Flashcard(props);
  }

  // --- Queries ---

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get pergunta(): string {
    return this.props.pergunta;
  }

  get resposta(): string {
    return this.props.resposta;
  }

  get conceitoId(): string | null {
    return this.props.conceitoId;
  }

  get conceitoNome(): string | null {
    return this.props.conceitoNome;
  }

  get spacedRepetition(): SpacedRepetitionData | null {
    return this.props.spacedRepetition;
  }

  get dataCriacao(): Date {
    return this.props.dataCriacao;
  }

  // --- Commands ---

  setSpacedRepetition(data: SpacedRepetitionData): void {
    this.props.spacedRepetition = data;
  }

  updateQuestion(pergunta: string): void {
    if (pergunta.trim()) {
      this.props.pergunta = pergunta.trim();
    }
  }

  updateAnswer(resposta: string): void {
    if (resposta.trim()) {
      this.props.resposta = resposta.trim();
    }
  }

  // --- Display helpers ---

  getStageLabel(): string | null {
    if (!this.props.spacedRepetition) return null;
    const labels: Record<number, string> = {
      1: "Novo",
      2: "Aprendiz",
      3: "Conhece",
      4: "Familiar",
      5: "Dominado",
    };
    return labels[this.props.spacedRepetition.estagioAprendizado] ?? null;
  }
}
