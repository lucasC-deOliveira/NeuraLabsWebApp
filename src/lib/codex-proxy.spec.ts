import { once } from "node:events";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { afterEach, expect, it } from "vitest";

const { makeCodexProxy } = createRequire(import.meta.url)("../../electron/codex-proxy.js") as {
  makeCodexProxy(token: string, complete: (prompt: string) => Promise<string>): Server;
};

class FakeCodexRunner {
  prompts: string[] = [];

  async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    return '{"result":"ok"}';
  }
}

let proxy: Server | undefined;
afterEach(async () => {
  if (!proxy) return;
  proxy.closeAllConnections();
  await new Promise<void>((resolve) => proxy?.close(() => resolve()));
  proxy = undefined;
});

it("requires the configured token and returns OpenAI-compatible JSON completions", async () => {
  const fake = new FakeCodexRunner();
  proxy = makeCodexProxy("local-test-token", (prompt) => fake.complete(prompt)).listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const { port } = proxy.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/v1/chat/completions`;
  const input = { messages: [{ role: "user", content: "Return JSON." }], response_format: { type: "json_object" } };
  const denied = await fetch(url, { method: "POST", body: JSON.stringify(input) });
  expect(denied.status).toBe(401);
  expect(fake.prompts).toEqual([]);
  const response = await fetch(url, {
    method: "POST", headers: { Authorization: "Bearer local-test-token" }, body: JSON.stringify(input),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    object: "chat.completion", choices: [{ message: { role: "assistant", content: '{"result":"ok"}' } }],
  });
  expect(fake.prompts[0]).toContain("Return JSON.");
});
