export interface UserProps {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: Date
  lastAccessAt: Date | null
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props)
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get email(): string { return this.props.email }
  get passwordHash(): string { return this.props.passwordHash }
  get createdAt(): Date { return this.props.createdAt }
  get lastAccessAt(): Date | null { return this.props.lastAccessAt }

  toPublicProfile(): { id: string; name: string; email: string } {
    return { id: this.props.id, name: this.props.name, email: this.props.email }
  }
}
