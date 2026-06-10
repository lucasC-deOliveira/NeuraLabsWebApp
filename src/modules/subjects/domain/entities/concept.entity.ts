export interface ConceptProps {
  id: string
  name: string
  description: string | null
  userId: string
  flashcardCount?: number
}

export class Concept {
  private constructor(private readonly props: ConceptProps) {}

  static create(props: ConceptProps): Concept {
    return new Concept(props)
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get description(): string | null { return this.props.description }
  get userId(): string { return this.props.userId }
  get flashcardCount(): number { return this.props.flashcardCount ?? 0 }

  toDTO(): { id: string; name: string; description: string | null; flashcardCount: number } {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      flashcardCount: this.flashcardCount,
    }
  }
}
