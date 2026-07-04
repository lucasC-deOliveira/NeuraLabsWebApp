// Subtipo cards for the manual editor: label, icon, description and a markdown
// template pre-filled when the user picks a type.
import {
  BookOpenIcon, MessageSquareIcon, LightbulbIcon, GitMergeIcon, LayersIcon,
  ArrowUpCircleIcon, AlertTriangleIcon, ZapIcon,
} from "lucide-react";
import type { SubtipoNota } from "../../domain/nota.types";

export interface SubtipoConfigEntry {
  value: SubtipoNota;
  label: string;
  icon: React.FC<{ className?: string }>;
  desc: string;
  template: string;
}

export const SUBTIPO_CONFIG: SubtipoConfigEntry[] = [
  {
    value: "DEFINICAO", label: "Definição", icon: BookOpenIcon, desc: "O que é um conceito",
    template: "## Definição\n\n[Defina o conceito em uma frase clara e precisa]\n\n## Características\n\n- [Característica 1]\n- [Característica 2]\n\n## Por que é importante?\n\n[Explique a relevância]",
  },
  {
    value: "EXPLICACAO", label: "Explicação", icon: MessageSquareIcon, desc: "Como funciona, por que existe",
    template: "## Explicação\n\n[Explique o conceito com suas próprias palavras]\n\n## Como funciona?\n\n[Descreva o mecanismo ou processo]\n\n## Pontos-chave\n\n- [Ponto 1]\n- [Ponto 2]",
  },
  {
    value: "EXEMPLO", label: "Exemplo", icon: LightbulbIcon, desc: "Caso concreto que ilustra um conceito",
    template: "## Exemplo\n\n[Descreva o exemplo concreto]\n\n## Conceito ilustrado\n\n[Que conceito este exemplo ilustra?]\n\n## Por que funciona?\n\n[Explique a conexão com o conceito]",
  },
  {
    value: "COMPARACAO", label: "Comparação", icon: GitMergeIcon, desc: "Diferenças e semelhanças entre conceitos",
    template: "## Comparação: [Conceito A] vs [Conceito B]\n\n| Aspecto | [A] | [B] |\n|---------|-----|-----|\n| [Aspecto 1] | | |\n| [Aspecto 2] | | |\n\n## Quando usar cada um?\n\n[Descreva os contextos]",
  },
  {
    value: "SINTESE", label: "Síntese", icon: LayersIcon, desc: "Resumo integrado de um tema",
    template: "## Síntese: [Tema]\n\n### Ideia central\n\n[A ideia mais importante em uma frase]\n\n### Pontos principais\n\n1. [Ponto 1]\n2. [Ponto 2]\n3. [Ponto 3]\n\n### Conexões\n\n- [Como se conecta com outros conceitos?]",
  },
  {
    value: "PREREQUISITO", label: "Pré-requisito", icon: ArrowUpCircleIcon, desc: "Base necessária antes de avançar",
    template: "## Pré-requisito: [Conceito base]\n\n[Explique o conceito base]\n\n## Por que é necessário?\n\n[Por que este conhecimento é fundamental]\n\n## O que se torna possível?\n\n- [Conceito avançado 1]\n- [Conceito avançado 2]",
  },
  {
    value: "ERRO_COMUM", label: "Erro Comum", icon: AlertTriangleIcon, desc: "Confusão frequente e como evitar",
    template: "## Erro Comum: [Descreva o erro]\n\n### Por que acontece?\n\n[Explique a confusão ou mal-entendido]\n\n### O correto é:\n\n[Explique a forma correta]\n\n### Exemplo\n\n❌ Errado: [exemplo errado]\n✅ Correto: [exemplo correto]",
  },
  {
    value: "APLICACAO", label: "Aplicação", icon: ZapIcon, desc: "Como usar o conceito na prática",
    template: "## Aplicação: [Descreva o caso de uso]\n\n### Contexto\n\n[Em que situação isso é aplicado?]\n\n### Como aplicar?\n\n1. [Passo 1]\n2. [Passo 2]\n\n### Resultado esperado\n\n[O que se obtém com esta aplicação?]",
  },
];
