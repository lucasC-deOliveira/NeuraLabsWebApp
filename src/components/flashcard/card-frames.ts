// Moldura do flashcard (inspirada no app disrupt, que emoldurava a carta no estudo).
// É uma preferência GLOBAL, separada do estilo do card: qualquer estilo pode ter
// qualquer moldura. O CSS mira `.fc-card` (o container da face) — o preenchimento
// aparece nas bordas porque a pergunta/resposta têm fundo próprio por cima.
// Diferente do disrupt, as molduras são CSS: acompanham o tema e não versionam
// imagem. Quem quiser uma arte própria usa a moldura "Imagem".

export type CardFrameId = "none" | "gold" | "silver" | "royal" | "neon" | "image";

export interface CardFrame {
  id: CardFrameId;
  name: string;
  // amostra do seletor (background CSS do mini-preview)
  swatch: string;
  css: string;
}

// Molduras metálicas: o brilho vem de paradas claras no meio do gradiente.
const GOLD_GRADIENT =
  "linear-gradient(150deg, #6b4f16, #d9b95c 30%, #f7ecc0 45%, #d9b95c 60%, #6b4f16)";
const SILVER_GRADIENT =
  "linear-gradient(150deg, #4b5563, #cbd5e1 30%, #f8fafc 45%, #cbd5e1 60%, #4b5563)";
const ROYAL_GRADIENT =
  "linear-gradient(150deg, #1e1b4b, #4338ca 35%, #818cf8 50%, #4338ca 65%, #1e1b4b)";

// Duas camadas: o gradiente cobre a caixa toda (border-box) e uma camada opaca da
// cor do card é pintada por cima, só na área de conteúdo (content-box). A moldura
// aparece apenas no vão da borda — sem isso o gradiente vaza por trás da resposta,
// que é translúcida (bg-muted/40), e engole o texto.
const frameCss = (background: string, extra = ""): string =>
  `.fc-card {
  padding: 0.75rem;
  border-radius: 1rem;
  background-image: linear-gradient(var(--card), var(--card)), ${background};
  background-clip: content-box, border-box;
  background-origin: content-box, border-box;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.2);${extra}
}`;

export const CARD_FRAMES: CardFrame[] = [
  {
    id: "none",
    name: "Sem moldura",
    swatch: "var(--muted)",
    css: "",
  },
  {
    id: "gold",
    name: "Dourada",
    swatch: GOLD_GRADIENT,
    css: frameCss(GOLD_GRADIENT),
  },
  {
    id: "silver",
    name: "Prata",
    swatch: SILVER_GRADIENT,
    css: frameCss(SILVER_GRADIENT),
  },
  {
    id: "royal",
    name: "Real",
    swatch: ROYAL_GRADIENT,
    css: frameCss(ROYAL_GRADIENT),
  },
  {
    id: "neon",
    name: "Neon",
    swatch: "linear-gradient(150deg, #0f172a, #22d3ee 50%, #0f172a)",
    css: frameCss(
      "linear-gradient(150deg, #0f172a, #22d3ee 50%, #0f172a)",
      "\n  box-shadow: 0 0 18px rgba(34, 211, 238, 0.55), inset 0 0 0 1px rgba(34, 211, 238, 0.8);",
    ),
  },
  {
    id: "image",
    name: "Imagem",
    swatch: "repeating-linear-gradient(45deg, var(--muted) 0 6px, var(--background) 6px 12px)",
    css: "",
  },
];

const FRAME_BY_ID = new Map(CARD_FRAMES.map((frame) => [frame.id, frame]));

export function getCardFrame(id: CardFrameId): CardFrame {
  return FRAME_BY_ID.get(id) ?? CARD_FRAMES[0];
}

// Só http(s), file:// (moldura local no app desktop) e data:image. O que tiver
// aspas, parênteses, barra invertida ou quebra de linha é recusado: sairia do
// url() e viraria CSS solto.
const SAFE_IMAGE_URL = /^(https?:\/\/|file:\/\/\/|data:image\/)[^"')\\\s]+$/i;

/**
 * CSS da moldura de imagem informada pelo usuário; string vazia se a URL não for
 * uma fonte de imagem aceitável.
 * @example frameImageCss("https://exemplo.com/moldura.png")
 */
export function frameImageCss(url: string): string {
  const trimmed = url.trim();
  if (!SAFE_IMAGE_URL.test(trimmed)) return "";
  return `.fc-card {
  padding: 2rem;
  border-radius: 1rem;
  background-image: url("${trimmed}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}`;
}

/** CSS da moldura ativa (preset ou imagem do usuário). */
export function getFrameCss(id: CardFrameId, imageUrl: string): string {
  return id === "image" ? frameImageCss(imageUrl) : getCardFrame(id).css;
}
