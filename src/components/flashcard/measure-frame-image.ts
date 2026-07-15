import type { FrameImageRatio } from "./card-frames";

// Mede a arte da moldura para o card poder assumir a forma dela. É efeito de DOM
// (carrega a imagem), por isso fica fora do card-frames, que é puro.

/**
 * Dimensões naturais da imagem, ou null se ela não carregar (endereço quebrado,
 * arquivo sumido). Nunca rejeita: quem chama trata "não sei" como "sem moldura".
 * @example await measureFrameImage("file:///C:/molduras/dourada.png")
 */
export function measureFrameImage(url: string): Promise<FrameImageRatio | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = (): void => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
    img.onerror = (): void => resolve(null);
    img.src = url;
  });
}
