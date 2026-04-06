import type { Nota } from "../entities/nota";

export interface NotaRepository {
  save(nota: Nota): Promise<number>; // returns count of created nodes
  findById(id: string): Promise<Nota | null>;
  findByUserId(userId: string): Promise<Nota[]>;
  delete(id: string): Promise<void>;
}
