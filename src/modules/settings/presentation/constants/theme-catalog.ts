// Swatch metadata for the theme picker previews. Pure UI data (colors) keyed by
// the ColorTheme ids from the color-theme provider.
import type { ColorTheme } from "@/components/color-theme-provider";

export type ThemeOption = { id: ColorTheme; name: string; bg: string; card: string; accent: string };

export const DARK_THEMES: ThemeOption[] = [
  { id: "classic-gx",        name: "Classic",           bg: "#1a0a0a", card: "#260f0f", accent: "#FA1E4E" },
  { id: "cyber-ultraviolet", name: "Cyber Ultraviolet", bg: "#0f0a1a", card: "#160f26", accent: "#9D4EDD" },
  { id: "chroma-teal",       name: "Chroma Teal",       bg: "#091a19", card: "#0f2625", accent: "#00F5D4" },
  { id: "acid-toxic",        name: "Acid Toxic",        bg: "#091409", card: "#0e1f0e", accent: "#39FF14" },
  { id: "purple-haze",       name: "Purple Haze",       bg: "#18151d", card: "#221d2b", accent: "#6B4DAB" },
  { id: "subzero",           name: "Subzero",           bg: "#12161d", card: "#1a2330", accent: "#00C8FF" },
  { id: "rose-quartz",       name: "Rose Quartz",       bg: "#1a171b", card: "#242028", accent: "#F7CAC9" },
  { id: "white-wolf",        name: "White Wolf",        bg: "#121212", card: "#1c1c1c", accent: "#E6E6E6" },
  { id: "cyberpunk-neon",    name: "Cyberpunk Neon",    bg: "#0b0f1a", card: "#161b2d", accent: "#FF008C" },
  { id: "cyberpunk-2077",    name: "Cyberpunk 2077",    bg: "#0f0f0a", card: "#1a1a0d", accent: "#FCEE0A" },
  { id: "jinx",              name: "Jinx",              bg: "#082046", card: "#1a1f2b", accent: "#C000B2" },
  { id: "hackerman",         name: "Hackerman",         bg: "#0b0c16", card: "#1a1d2b", accent: "#28C23C" },
];

export const LIGHT_THEMES: ThemeOption[] = [
  { id: "light-gx-core", name: "Light Core", bg: "#fafafa", card: "#ffffff", accent: "#E01A4F" },
  { id: "neon-frost",    name: "Neon Frost",    bg: "#f0f6fb", card: "#ffffff", accent: "#0284C7" },
  { id: "cyber-quartz",  name: "Cyber Quartz",  bg: "#f4f0fb", card: "#ffffff", accent: "#7B2CBF" },
  { id: "digital-mint",  name: "Digital Mint",  bg: "#f0faf6", card: "#ffffff", accent: "#059669" },
];
