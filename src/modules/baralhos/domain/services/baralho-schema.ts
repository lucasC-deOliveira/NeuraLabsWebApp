import { z } from "zod";
import { baralhoTitulo } from "@contracts/baralhos";

// Validação do formulário de novo baralho. O título REUSA a regra do contrato
// (contracts/baralhos.ts), então o teto que o servidor cobra vira erro de campo
// aqui em vez de um 400 depois do submit.
export const baralhoSchema = z.object({
  titulo: baralhoTitulo,
});
export type BaralhoInput = z.infer<typeof baralhoSchema>;
