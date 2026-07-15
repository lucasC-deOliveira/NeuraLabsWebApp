// Baralhos domain errors (English, internal); mapped to PT in the interface layer.

export class BaralhoNotFoundError extends Error {
  constructor(baralhoId: string) {
    super(`Baralho not found: "${baralhoId}".`);
    this.name = 'BaralhoNotFoundError';
  }
}

export class InvalidBaralhoTitleError extends Error {
  constructor(titulo: string) {
    super(`Invalid baralho title: "${titulo}". Expected: 1..120 non-blank characters.`);
    this.name = 'InvalidBaralhoTitleError';
  }
}

export class EmptyImportError extends Error {
  constructor() {
    super('Nothing to import. Expected: at least one baralho with at least one card.');
    this.name = 'EmptyImportError';
  }
}
