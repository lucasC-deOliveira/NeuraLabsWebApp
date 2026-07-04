// Display metadata for each generated-flashcard source type (grouping in the
// "from note" preview).
import type { FlashcardSourceType } from "../../domain/flashcard-source.types";

export const SOURCE_CONFIG: Record<FlashcardSourceType, { label: string; icon: string; description: string }> = {
  pergunta_resposta: { label: "Pergunta → Resposta", icon: "🧠", description: "Clássico" },
  cloze: { label: "Cloze", icon: "🔁", description: "Preenchimento" },
  bidirecional: { label: "Bidirecional", icon: "🔄", description: "Ida e volta" },
  explicacao_profunda: { label: "Explicação Profunda", icon: "🧩", description: "Compreensão" },
  comparacao: { label: "Comparação", icon: "⚖️", description: "Diferenças" },
  lista_fragmentada: { label: "Lista Fragmentada", icon: "📊", description: "Pontos-chave" },
  aplicacao_problema: { label: "Aplicação / Problema", icon: "🧠", description: "Raciocínio" },
  identificacao_imagem: { label: "Identificação", icon: "🖼️", description: "Reconhecimento" },
  erro_comum: { label: "Erro Comum", icon: "⚠️", description: "Pegadinha" },
  definicao: { label: "Definição", icon: "📖", description: "Conceito" },
  finalidade: { label: "Finalidade", icon: "🎯", description: "Para que serve" },
  importancia: { label: "Importância", icon: "💡", description: "Por que importa" },
  caracteristicas: { label: "Características", icon: "🔍", description: "Detalhes" },
  diferenca: { label: "Diferença", icon: "⚡", description: "Contraste" },
  conteudo: { label: "Conteúdo", icon: "📝", description: "Texto" },
};
