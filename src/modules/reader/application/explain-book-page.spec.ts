import { expect, it } from "vitest";
import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import { explainBookPage } from "./explain-book-page";

class FakeReadingProxy {
  request: VaultChatRequest | null = null;

  ask = async (request: VaultChatRequest): Promise<VaultChatResponse> => {
    this.request = request;
    return { answer: " Uma analogia explicativa. ", referencedNodes: [] };
  };
}

it("prioritizes the selected passage and bounds the current page sent to the proxy", async () => {
  const proxy = new FakeReadingProxy();
  const result = await explainBookPage({
    page: 7, mode: "analogy", question: "Como isso funciona?", selection: "Selected sentence.",
    pageText: "Full page of source material. ".repeat(400), history: [],
  }, proxy.ask);
  expect(result).toBe("Uma analogia explicativa.");
  expect(proxy.request?.question).toContain("Identifique-a como analogia");
  expect(proxy.request?.sources[0]).toMatchObject({ id: "page-7-1", excerpt: "Selected sentence." });
  expect(proxy.request?.sources).toHaveLength(6);
  expect(proxy.request?.sources.every(({ excerpt }) => excerpt.length <= 900)).toBe(true);
});

it("skips the provider when there is no text on the selected page", async () => {
  const proxy = new FakeReadingProxy();
  expect(await explainBookPage({
    page: 2, mode: "summary", question: "", selection: "", pageText: "  ", history: [],
  }, proxy.ask)).toBeNull();
  expect(proxy.request).toBeNull();
});
