// Trilha de navegação do header, derivada da ROTA. O app disrupt, que inspirou este
// header, mandava cada página registrar a trilha num efeito (changePaths); aqui ela é
// deduzida do pathname — puro, testável e sem efeito espalhado por página.

export type CrumbIcon =
  | "home"
  | "flashcards"
  | "baralhos"
  | "questions"
  | "provas"
  | "notes"
  | "study"
  | "graph"
  | "settings";

export interface Crumb {
  name: string;
  href: string;
  icon: CrumbIcon;
}

const HOME: Crumb = { name: "Home", href: "/", icon: "home" };

// Seções de primeiro nível. A ordem não importa: o casamento é por prefixo exato.
const SECTIONS: Crumb[] = [
  { name: "Flashcards", href: "/flashcards", icon: "flashcards" },
  { name: "Baralhos", href: "/baralhos", icon: "baralhos" },
  { name: "Questões", href: "/questions", icon: "questions" },
  { name: "Provas", href: "/provas", icon: "provas" },
  { name: "Notas", href: "/notes", icon: "notes" },
  { name: "Estudar", href: "/study", icon: "study" },
  { name: "Grafo", href: "/graph", icon: "graph" },
  { name: "Configurações", href: "/settings", icon: "settings" },
];

const GRAFO = SECTIONS.find((s) => s.href === "/graph") ?? HOME;

function sectionOf(pathname: string): Crumb | null {
  // O VR é uma visão alternativa de um grafo: a trilha leva de volta ao grafo.
  if (pathname.startsWith("/vr/")) return GRAFO;
  return SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) ?? null;
}

/**
 * Ancestrais da página atual, do mais amplo ao mais específico. Não inclui a própria
 * página — o título dela é o fim da trilha e o header já o mostra.
 * @example resolveCrumbs("/baralhos/abc") // [Home, Baralhos]
 */
export function resolveCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [];
  const section = sectionOf(pathname);
  if (!section) return [HOME];
  const isSectionRoot = pathname === section.href;
  return isSectionRoot ? [HOME] : [HOME, section];
}

/**
 * Botão de voltar só nas páginas internas de uma seção (detalhe, nova): na raiz da
 * seção o voltar levaria ao Dashboard, que a sidebar já oferece.
 * @example shouldShowBack("/flashcards/new") // true
 */
export function shouldShowBack(pathname: string): boolean {
  return resolveCrumbs(pathname).length > 1;
}
