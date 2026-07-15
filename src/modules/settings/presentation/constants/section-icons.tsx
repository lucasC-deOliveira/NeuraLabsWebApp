// Ícone de cada seção. O registro (domain) guarda só a chave, para não depender de
// React; a resolução para o componente acontece aqui.
import { PaletteIcon, WandSparklesIcon, SparklesIcon, MonitorIcon, type LucideIcon } from "lucide-react";
import type { SettingsIcon } from "../../domain/settings-sections";

export const SECTION_ICONS: Record<SettingsIcon, LucideIcon> = {
  aparencia: PaletteIcon,
  flashcards: WandSparklesIcon,
  ia: SparklesIcon,
  desktop: MonitorIcon,
};
