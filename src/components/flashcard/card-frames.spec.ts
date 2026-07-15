import { describe, it, expect } from "vitest";
import {
  CARD_FRAMES,
  getCardFrame,
  getFrameCss,
  frameImageCss,
  isFrameImageUrl,
} from "./card-frames";

// Molduras de carta são retrato (a do disrupt: 221x405).
const RETRATO = { largura: 221, altura: 405 };

describe("getCardFrame", () => {
  it("finds a frame by id", () => {
    expect(getCardFrame("gold").name).toBe("Dourada");
  });

  it("falls back to no frame for an unknown id", () => {
    expect(getCardFrame("nope" as never).id).toBe("none");
  });

  it("has no css for the default (no frame)", () => {
    expect(getCardFrame("none").css).toBe("");
  });

  it("gives every frame a preview swatch", () => {
    for (const frame of CARD_FRAMES) expect(frame.swatch).not.toBe("");
  });

  // Regressão: a moldura pintava o fundo inteiro e vazava por trás da resposta
  // (que é translúcida), deixando o texto ilegível. Ela só pode pintar a borda.
  it("paints the frame only around the content, never behind it", () => {
    for (const frame of CARD_FRAMES) {
      if (frame.css === "") continue;
      expect(frame.css).toContain("background-clip: content-box, border-box");
      expect(frame.css).toContain("linear-gradient(var(--card), var(--card))");
    }
  });
});

describe("getFrameCss", () => {
  it("returns the preset css, ignoring the image url", () => {
    expect(getFrameCss("gold", "")).toBe(getCardFrame("gold").css);
  });

  it("uses the user image when the image frame is active", () => {
    expect(getFrameCss("image", "https://x.test/f.png", RETRATO)).toContain('url("https://x.test/f.png")');
  });

  it("renders no frame when the image frame is active without an url", () => {
    expect(getFrameCss("image", "")).toBe("");
  });
});

// O ponto da moldura de imagem: a arte manda na forma. Esticá-la para caber num card
// largo deformava o ornamento (as artes de carta são retrato).
describe("frameImageCss: o card assume a forma da moldura", () => {
  it("gives the card the exact ratio of the art", () => {
    const css = frameImageCss("https://x.test/f.png", RETRATO);
    expect(css).toContain("aspect-ratio: 221 / 405");
  });

  it("caps the height and derives the width, so a tall frame still fits the screen", () => {
    const css = frameImageCss("https://x.test/f.png", RETRATO);
    // 221/405 ≈ 0.5457
    expect(css).toContain("max-width: min(100%, calc(70vh * 0.5457))");
  });

  it("follows a landscape frame just the same", () => {
    const css = frameImageCss("https://x.test/f.png", { largura: 400, altura: 200 });
    expect(css).toContain("aspect-ratio: 400 / 200");
    expect(css).toContain("calc(70vh * 2.0000)");
  });

  it("renders no frame before the art is measured, instead of a distorted one", () => {
    expect(frameImageCss("https://x.test/f.png", null)).toBe("");
  });

  it("renders no frame for art with no height, which would divide by zero", () => {
    expect(frameImageCss("https://x.test/f.png", { largura: 10, altura: 0 })).toBe("");
  });

  it("lets long content scroll inside the fixed shape", () => {
    expect(frameImageCss("https://x.test/f.png", RETRATO)).toContain("overflow-y: auto");
  });
});

// Com moldura, a moldura é o card: nada de caixa dentro da caixa. É a regra do
// disrupt, onde o box só existe quando NÃO há arte.
describe("moldura substitui a caixa", () => {
  it("drops the box from question and answer under an image frame", () => {
    const css = frameImageCss("https://x.test/f.png", RETRATO);
    expect(css).toContain(".fc-pergunta, .fc-resposta");
    expect(css).toContain("border: none");
    expect(css).toContain("background: none");
  });

  it("drops the box under every preset frame too", () => {
    for (const frame of CARD_FRAMES) {
      if (frame.css === "") continue;
      expect(frame.css).toContain("border: none");
      expect(frame.css).toContain("background: none");
    }
  });

  it("centers the content, like the art of a real card", () => {
    expect(frameImageCss("https://x.test/f.png", RETRATO)).toContain("justify-content: center");
    expect(getCardFrame("gold").css).toContain("justify-content: center");
  });

  // Sem moldura não há o que substituir: a caixa é o card.
  it("keeps the box when there is no frame", () => {
    expect(getCardFrame("none").css).toBe("");
    expect(getFrameCss("none", "")).toBe("");
  });
});

describe("isFrameImageUrl", () => {
  it("accepts http(s), file and data:image", () => {
    expect(isFrameImageUrl("https://x.test/f.png")).toBe(true);
    expect(isFrameImageUrl("file:///C:/f.png")).toBe(true);
    expect(isFrameImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isFrameImageUrl("javascript:alert(1)")).toBe(false);
    expect(isFrameImageUrl("")).toBe(false);
  });
});

describe("frameImageCss", () => {
  it("accepts http(s) urls", () => {
    expect(frameImageCss("https://x.test/f.png", RETRATO)).toContain("background-image");
    expect(frameImageCss("http://x.test/f.png", RETRATO)).toContain("background-image");
  });

  it("accepts a local file url, for a frame on the desktop app", () => {
    expect(frameImageCss("file:///C:/frames/gold.png", RETRATO)).toContain('url("file:///C:/frames/gold.png")');
  });

  it("accepts a data uri image", () => {
    expect(frameImageCss("data:image/png;base64,iVBORw0KGgo=", RETRATO)).toContain("background-image");
  });

  it("trims surrounding whitespace", () => {
    expect(frameImageCss("  https://x.test/f.png  ", RETRATO)).toContain('url("https://x.test/f.png")');
  });

  it("ignores an empty url", () => {
    expect(frameImageCss("", RETRATO)).toBe("");
    expect(frameImageCss("   ", RETRATO)).toBe("");
  });

  it("refuses a url that would break out of the css url(), instead of injecting it", () => {
    expect(frameImageCss('https://x.test/f.png"); body { display: none } .x { a: url("', RETRATO)).toBe("");
    expect(frameImageCss("https://x.test/a.png) ; }", RETRATO)).toBe("");
    expect(frameImageCss("https://x.test/a.png\\", RETRATO)).toBe("");
    expect(frameImageCss("https://x.test/a.png\n.evil{}", RETRATO)).toBe("");
  });

  it("refuses schemes that are not an image source", () => {
    expect(frameImageCss("javascript:alert(1)", RETRATO)).toBe("");
    expect(frameImageCss("data:text/html,<script>", RETRATO)).toBe("");
    expect(frameImageCss("/relative/path.png", RETRATO)).toBe("");
  });
});
