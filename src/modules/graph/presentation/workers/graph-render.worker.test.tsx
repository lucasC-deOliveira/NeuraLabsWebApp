import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./graph-render.worker";

// O worker registra self.onmessage no import (em jsdom, self existe). Cobrimos o
// carregamento + o branch hitTest, que é pura geometria (sem OffscreenCanvas).
let postSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  postSpy = vi.spyOn(self, "postMessage").mockImplementation(() => {});
  vi.stubGlobal("requestAnimationFrame", () => 0);
});
afterEach(() => {
  postSpy.mockRestore();
  vi.unstubAllGlobals();
});

const send = (data: Record<string, unknown>) =>
  self.onmessage?.({ data } as MessageEvent);

describe("graph-render.worker (smoke)", () => {
  it("registers a message handler on import", () => {
    expect(typeof self.onmessage).toBe("function");
  });

  it("answers a hitTest with a null hit when no nodes are visible", () => {
    send({ type: "hitTest", cx: 0, cy: 0 });
    expect(postSpy).toHaveBeenCalledWith({ type: "hitResult", id: null });
  });

  it("ignores unknown message types without throwing", () => {
    expect(() => send({ type: "totally-unknown" })).not.toThrow();
  });
});
