// Card type options for the manual flashcard editor.
import type { ManualCardType } from "../../domain/manual-card";

export interface ManualTypeEntry {
  value: ManualCardType;
  label: string;
  icon: string;
  description: string;
}

export const MANUAL_TYPES: ManualTypeEntry[] = [
  { value: "DEFINICAO",  label: "Definição",  icon: "📖", description: "O que é este conceito?" },
  { value: "EXPLICACAO", label: "Explicação", icon: "🧩", description: "Como funciona? Por quê?" },
  { value: "EXEMPLO",    label: "Exemplo",    icon: "💡", description: "Ilustração concreta" },
  { value: "APLICACAO",  label: "Aplicação",  icon: "🔮", description: "Cenário prático" },
  { value: "CONTRASTE",  label: "Contraste",  icon: "⚖️", description: "Diferenças entre conceitos" },
  { value: "COMPLETAR",  label: "Completar",  icon: "🔁", description: "Preencher lacuna" },
  { value: "ORDENACAO",  label: "Ordenação",  icon: "📊", description: "Sequência correta" },
  { value: "RELACIONAL", label: "Relacional", icon: "🔗", description: "Relacionar termos" },
  { value: "ERRO_COMUM", label: "Erro Comum", icon: "⚠️", description: "Identificar e corrigir erro" },
];
