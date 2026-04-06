import type { Nota } from "../entities/nota";

export interface NotaRepository {
  save(nota: Nota): Promise<void>;
  findById(id: string): Promise<Nota | null>;
  findByUserId(userId: string): Promise<Nota[]>;
  delete(id: string): Promise<void>;
}
