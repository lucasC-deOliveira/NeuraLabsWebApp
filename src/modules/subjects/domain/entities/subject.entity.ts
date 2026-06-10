export interface SubjectProps {
  id: string
  name: string
  description: string | null
  userId: string
}

export class Subject {
  private constructor(private readonly props: SubjectProps) {}

  static create(props: SubjectProps): Subject {
    return new Subject(props)
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get description(): string | null { return this.props.description }
  get userId(): string { return this.props.userId }

  toDTO(): { id: string; name: string; description: string | null } {
    return { id: this.props.id, name: this.props.name, description: this.props.description }
  }
}
