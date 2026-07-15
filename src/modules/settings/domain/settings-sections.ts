// Registro das seções de configuração. A lista e as subtelas leem daqui, então
// acrescentar uma seção é acrescentar uma entrada — sem tocar em rota nem em menu.
// Puro: o ícone é uma chave, resolvida na camada de apresentação.

export type SettingsSectionId = "aparencia" | "flashcards" | "ia" | "desktop";

export type SettingsIcon = "aparencia" | "flashcards" | "ia" | "desktop";

export interface SettingsSection {
  id: SettingsSectionId;
  titulo: string;
  // Resumo do que tem dentro, como o Android mostra sob cada entrada.
  resumo: string;
  icon: SettingsIcon;
  // Vault e Claude Code só existem no app desktop.
  desktopOnly: boolean;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "aparencia",
    titulo: "Aparência",
    resumo: "Tema de cor, claro/escuro e efeito neon",
    icon: "aparencia",
    desktopOnly: false,
  },
  {
    id: "flashcards",
    titulo: "Flashcards",
    resumo: "Estilo do card, moldura e CSS personalizado",
    icon: "flashcards",
    desktopOnly: false,
  },
  {
    id: "ia",
    titulo: "Conexão com IA",
    resumo: "Chave da API, endereço e modelo",
    icon: "ia",
    desktopOnly: false,
  },
  {
    id: "desktop",
    titulo: "Desktop",
    resumo: "Pasta do vault e Claude Code local",
    icon: "desktop",
    desktopOnly: true,
  },
];

/**
 * Seções visíveis: as de desktop somem no navegador, onde não há vault nem
 * Claude Code para configurar.
 * @example visibleSections(false).map((s) => s.id) // ["aparencia", "flashcards", "ia"]
 */
export function visibleSections(isDesktop: boolean): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => !s.desktopOnly || isDesktop);
}

/**
 * Seção pela URL. Devolve null para slug desconhecido — ou para uma seção de
 * desktop aberta no navegador, que não deve existir ali.
 * @example findSection("ia", false)?.titulo // "Conexão com IA"
 */
export function findSection(slug: string, isDesktop: boolean): SettingsSection | null {
  return visibleSections(isDesktop).find((s) => s.id === slug) ?? null;
}
