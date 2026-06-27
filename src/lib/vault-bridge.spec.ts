import { describe, it, expect, vi, afterEach } from "vitest";
import { isDesktop, desktop } from "./vault-bridge";

// vault-bridge fala com window.neuralabs (preload do Electron). No env node
// stubbamos window p/ exercitar os dois caminhos: com e sem a ponte.
afterEach(() => vi.unstubAllGlobals());

function stubBridge(neuralabs: unknown): void {
  vi.stubGlobal("window", { neuralabs });
}

describe("isDesktop", () => {
  it("is false without a bridge or without the desktop flag", () => {
    vi.stubGlobal("window", {});
    expect(isDesktop()).toBe(false);
    stubBridge({ isDesktop: false });
    expect(isDesktop()).toBe(false);
  });

  it("is true when the preload bridge reports desktop", () => {
    stubBridge({ isDesktop: true });
    expect(isDesktop()).toBe(true);
  });
});

describe("desktop.* delegation", () => {
  it("throws a desktop-only error when there is no bridge", async () => {
    vi.stubGlobal("window", {});
    expect(() => desktop.getApiUrl()).toThrow("Recurso disponível apenas no app desktop.");
  });

  it("delegates to the bridge when present", async () => {
    const getApiUrl = vi.fn(() => Promise.resolve("http://x"));
    const write = vi.fn(() => Promise.resolve({ written: 2 }));
    stubBridge({ isDesktop: true, getApiUrl, vault: { write } });

    expect(await desktop.getApiUrl()).toBe("http://x");
    await desktop.vault.write("/dir", [{ relPath: "a.md", content: "x" }]);
    expect(write).toHaveBeenCalledWith("/dir", [{ relPath: "a.md", content: "x" }]);
  });
});
