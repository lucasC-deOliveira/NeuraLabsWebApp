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

// Com moldura, a moldura É o card: pergunta e resposta perdem caixa, borda e fundo e
// ficam direto sobre ela, centralizadas. É o que o disrupt faz — lá o box só existe
// quando NÃO há moldura (`!imageSrc ? "border-2 bg-black" : ""`); com arte, sobra ela.
const NO_BOX_CSS = `.fc-pergunta, .fc-resposta {
  border: none;
  background: none;
  box-shadow: none;
  padding: 0;
  text-align: center;
}`;

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
  padding: 1.5rem;
  border-radius: 1rem;
  justify-content: center;
  background-image: linear-gradient(var(--card), var(--card)), ${background};
  background-clip: content-box, border-box;
  background-origin: content-box, border-box;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.2);${extra}
}
${NO_BOX_CSS}`;

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

/** Endereço aceitável para uma moldura de imagem? */
export function isFrameImageUrl(url: string): boolean {
  return SAFE_IMAGE_URL.test(url.trim());
}

// Dimensões naturais da arte. O CSS não as conhece — quem chama mede a imagem.
export interface FrameImageRatio {
  largura: number;
  altura: number;
}

// O card não pode crescer sem limite: molduras de carta são retrato e altas, e a
// altura sai da largura. Limitar a altura e derivar a largura mantém a proporção.
const MAX_CARD_HEIGHT = "70vh";
// Vão da arte, em % da largura do card: o topo das molduras costuma ter ornamento.
const FRAME_PADDING = "13% 9% 10%";

/**
 * CSS da moldura de imagem. O CARD ASSUME A FORMA DA MOLDURA: a arte mantém a
 * proporção original e o card se ajusta a ela — esticar a moldura para caber no
 * card deformava o ornamento.
 *
 * Sem a medida (imagem ainda carregando, ou que falhou) não há moldura: melhor
 * nenhuma do que uma arte deformada.
 * @example frameImageCss("https://x/moldura.png", { largura: 221, altura: 405 })
 */
export function frameImageCss(url: string, ratio: FrameImageRatio | null): string {
  const trimmed = url.trim();
  if (!isFrameImageUrl(trimmed) || !ratio || ratio.altura <= 0) return "";
  const proporcao = (ratio.largura / ratio.altura).toFixed(4);
  return `.fc-card {
  aspect-ratio: ${ratio.largura} / ${ratio.altura};
  max-width: min(100%, calc(${MAX_CARD_HEIGHT} * ${proporcao}));
  margin-inline: auto;
  overflow-y: auto;
  justify-content: center;
  padding: ${FRAME_PADDING};
  border-radius: 1rem;
  background-image: url("${trimmed}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
${NO_BOX_CSS}`;
}

/** CSS da moldura ativa (preset ou imagem do usuário). */
export function getFrameCss(
  id: CardFrameId,
  imageUrl: string,
  ratio: FrameImageRatio | null = null,
): string {
  return id === "image" ? frameImageCss(imageUrl, ratio) : getCardFrame(id).css;
}
