export abstract class BaseEntity<TProps> {
  constructor(protected readonly props: TProps) {}
}
