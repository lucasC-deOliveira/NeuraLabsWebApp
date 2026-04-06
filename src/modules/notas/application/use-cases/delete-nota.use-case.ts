import { NotaRepository } from "../../domain/repositories/nota-repository";

export class DeleteNotaUseCase {
  constructor(private notaRepository: NotaRepository) {}

  async execute(notaId: string, userId: string): Promise<void> {
    const nota = await this.notaRepository.findById(notaId);
    if (!nota || nota.userId !== userId) {
      throw new Error("Nota não encontrada");
    }
    await this.notaRepository.delete(notaId);
  }
}
