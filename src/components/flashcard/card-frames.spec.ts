import { describe, it, expect } from "vitest";
import { CARD_FRAMES, getCardFrame, getFrameCss, frameImageCss } from "./card-frames";

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
    expect(getFrameCss("image", "https://x.test/f.png")).toContain('url("https://x.test/f.png")');
  });

  it("renders no frame when the image frame is active without an url", () => {
    expect(getFrameCss("image", "")).toBe("");
  });
});

describe("frameImageCss", () => {
  it("accepts http(s) urls", () => {
    expect(frameImageCss("https://x.test/f.png")).toContain("background-image");
    expect(frameImageCss("http://x.test/f.png")).toContain("background-image");
  });

  it("accepts a local file url, for a frame on the desktop app", () => {
    expect(frameImageCss("file:///C:/frames/gold.png")).toContain('url("file:///C:/frames/gold.png")');
  });

  it("accepts a data uri image", () => {
    expect(frameImageCss("data:image/png;base64,iVBORw0KGgo=")).toContain("background-image");
  });

  it("trims surrounding whitespace", () => {
    expect(frameImageCss("  https://x.test/f.png  ")).toContain('url("https://x.test/f.png")');
  });

  it("ignores an empty url", () => {
    expect(frameImageCss("")).toBe("");
    expect(frameImageCss("   ")).toBe("");
  });

  it("refuses a url that would break out of the css url(), instead of injecting it", () => {
    expect(frameImageCss('https://x.test/f.png"); body { display: none } .x { a: url("')).toBe("");
    expect(frameImageCss("https://x.test/a.png) ; }")).toBe("");
    expect(frameImageCss("https://x.test/a.png\\")).toBe("");
    expect(frameImageCss("https://x.test/a.png\n.evil{}")).toBe("");
  });

  it("refuses schemes that are not an image source", () => {
    expect(frameImageCss("javascript:alert(1)")).toBe("");
    expect(frameImageCss("data:text/html,<script>")).toBe("");
    expect(frameImageCss("/relative/path.png")).toBe("");
  });
});
