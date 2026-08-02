import { z } from "zod";

// Contrato das rotas de autenticação. Mensagens em pt-BR: o servidor as devolve
// no 400 e elas chegam ao usuário dentro do campo do formulário.

export const SENHA_MIN_LENGTH = 6;

const email = z.string().trim().email("Informe um email válido");

export const registerContract = z.object({
  nome: z.string().trim().min(1, "Informe seu nome"),
  email,
  senha: z.string().min(SENHA_MIN_LENGTH, `A senha precisa de pelo menos ${SENHA_MIN_LENGTH} caracteres`),
});
export type RegisterBody = z.infer<typeof registerContract>;

export const loginContract = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha"),
});
export type LoginBody = z.infer<typeof loginContract>;
