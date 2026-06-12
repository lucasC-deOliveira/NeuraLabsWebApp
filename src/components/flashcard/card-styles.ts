// Estilos de flashcard (nível Anki): um estilo GLOBAL ativo, trocável como o
// tema, com presets prontos + um CSS personalizado. O CSS é injetado num
// <style> global e mira as classes da face do card:
//   .fc-card       — o container do card
//   .fc-pergunta   — bloco da pergunta
//   .fc-resposta   — bloco da resposta
//   .fc-label      — rótulos "Pergunta"/"Resposta"
//   .fc-conceito   — linha do conceito
// Como só os flashcards usam essas classes, o CSS dos presets fica naturalmente
// restrito a eles.

export type CardStyleId = "classic" | "dark" | "neon" | "paper" | "custom";

export type CardStyle = {
  id: CardStyleId;
  name: string;
  // cores representativas para o mini-preview do seletor
  swatch: { bg: string; card: string; accent: string };
  css: string;
};

// classes disponíveis para o editor de CSS personalizado (ajuda ao usuário)
export const CARD_CSS_CLASSES = [
  ".fc-card",
  ".fc-pergunta",
  ".fc-resposta",
  ".fc-label",
  ".fc-conceito",
];

// Clássico = aparência padrão (sem CSS extra; usa o estilo do tema atual).
export const CARD_STYLES: CardStyle[] = [
  {
    id: "classic",
    name: "Clássico",
    swatch: { bg: "var(--background)", card: "var(--card)", accent: "var(--primary)" },
    css: "",
  },
  {
    id: "dark",
    name: "Escuro",
    swatch: { bg: "#0b1220", card: "#0f172a", accent: "#38bdf8" },
    css: `.fc-card { gap: 0.75rem; }
.fc-pergunta, .fc-resposta {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 1rem;
  padding: 1.25rem;
}
.fc-resposta { border-color: #38bdf8; background: #0b1220; }
.fc-label { color: #64748b; }
.fc-resposta .fc-label { color: #38bdf8; }
.fc-pergunta, .fc-pergunta p, .fc-resposta, .fc-resposta p { color: #e2e8f0; }`,
  },
  {
    id: "neon",
    name: "Neon",
    swatch: { bg: "#0b0f1a", card: "#11162a", accent: "#ff008c" },
    css: `.fc-pergunta, .fc-resposta {
  background: #0b0f1a;
  border: 1px solid #ff008c;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 0 14px -2px #ff008c;
}
.fc-resposta { border-color: #00f5ff; box-shadow: 0 0 14px -2px #00f5ff; }
.fc-label { color: #ff008c; letter-spacing: 0.12em; }
.fc-resposta .fc-label { color: #00f5ff; }
.fc-pergunta, .fc-pergunta p { color: #e8f1ff; }
.fc-resposta, .fc-resposta p { color: #bdf3ff; }`,
  },
  {
    id: "paper",
    name: "Papel",
    swatch: { bg: "#efe9da", card: "#fffdf7", accent: "#b08900" },
    css: `.fc-pergunta, .fc-resposta {
  background: #fffdf7;
  border: 1px solid #e7e0cf;
  border-radius: 0.5rem;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}
.fc-resposta { background: #f6f1e3; }
.fc-label { color: #a89a73; }
.fc-resposta .fc-label { color: #b08900; }
.fc-pergunta, .fc-pergunta p, .fc-resposta, .fc-resposta p { color: #4a4222; }`,
  },
  {
    id: "custom",
    name: "Personalizado",
    swatch: { bg: "var(--background)", card: "var(--muted)", accent: "var(--primary)" },
    css: "",
  },
];

export const DEFAULT_CUSTOM_CSS = `/* Edite o CSS do flashcard. Classes: ${CARD_CSS_CLASSES.join(", ")} */
.fc-pergunta, .fc-resposta {
  border-radius: 1rem;
  padding: 1.25rem;
}
.fc-resposta {
  border-color: var(--primary);
}`;

const STYLE_BY_ID = new Map(CARD_STYLES.map((s) => [s.id, s]));

export function getCardStyle(id: CardStyleId): CardStyle {
  return STYLE_BY_ID.get(id) ?? CARD_STYLES[0];
}

// CSS efetivamente aplicado para um estilo (preset ou personalizado).
export function getActiveCardCss(id: CardStyleId, customCss: string): string {
  return id === "custom" ? customCss : getCardStyle(id).css;
}
