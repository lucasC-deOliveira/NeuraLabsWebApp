import { z } from "zod";

// Validação do formulário de novo baralho. Regra pura no domínio; a UI
// (react-hook-form) consome via resolver. Mensagem voltada ao usuário (pt-BR).
export const baralhoSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título do baralho"),
});
export type BaralhoInput = z.infer<typeof baralhoSchema>;
