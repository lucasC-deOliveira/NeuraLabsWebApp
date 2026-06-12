import { Nota } from "../../domain/entities/nota";
import { NotaRepository } from "../../domain/repositories/nota-repository";

export interface GetNotaOutput {
  id: string;
  userId: string;
  titulo: string | null;
  conteudo: string;
  conceitoIds: ReadonlyArray<string>;
  flashcardIds: ReadonlyArray<string>;
  createdAt: Date;
}

export class GetNotaUseCase {
  constructor(private notaRepository: NotaRepository) {}

  async execute(notaId: string, userId: string): Promise<GetNotaOutput | null> {
    const nota = await this.notaRepository.findById(notaId);
    if (!nota || nota.userId !== userId) return null;

    return {
      id: nota.id,
      userId: nota.userId,
      titulo: nota.titulo,
      conteudo: nota.conteudo,
      conceitoIds: nota.conceitoIds,
      flashcardIds: nota.flashcardIds,
      createdAt: nota.createdAt,
    };
  }
}
