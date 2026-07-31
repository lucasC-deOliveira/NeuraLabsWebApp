import { z } from "zod";

// Schemas de validação dos formulários de auth (zod). Regras puras no domínio; a UI
// (react-hook-form) consome via resolver. Mensagens são voltadas ao usuário (pt-BR).
export const loginSchema = z.object({
  email: z.string().min(1, "Informe o email").email("Email invalido"),
  senha: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome"),
    email: z.string().min(1, "Informe o email").email("Email invalido"),
    senha: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
    senhaConfirm: z.string(),
  })
  .refine((d) => d.senha === d.senhaConfirm, {
    message: "As senhas nao coincidem",
    path: ["senhaConfirm"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
