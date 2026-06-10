/**
 * Unit tests for proxy.ts route protection logic.
 * No mocks needed — NextRequest/NextResponse work in plain Node.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(path: string, sessionToken?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["cookie"] = `flashmind_session=${sessionToken}`;
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

// ---------------------------------------------------------------------------
// Public / static bypass
// ---------------------------------------------------------------------------

describe("proxy — public bypass", () => {
  it("passes _next/static paths through", async () => {
    const res = await proxy(makeRequest("/_next/static/chunk.js"));
    expect(res.status).toBe(200);
  });

  it("passes _next/image paths through", async () => {
    const res = await proxy(makeRequest("/_next/image?url=x"));
    expect(res.status).toBe(200);
  });

  it("passes /api/ paths through unconditionally", async () => {
    const res = await proxy(makeRequest("/api/auth"));
    expect(res.status).toBe(200);
  });

  it("passes /favicon.ico through", async () => {
    const res = await proxy(makeRequest("/favicon.ico"));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated user
// ---------------------------------------------------------------------------

describe("proxy — unauthenticated redirects", () => {
  it("redirects / to /login", async () => {
    const res = await proxy(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(location(res)).toContain("/login");
  });

  it("includes callbackUrl in the redirect query string", async () => {
    const res = await proxy(makeRequest("/flashcards"));
    expect(location(res)).toContain("callbackUrl=%2Fflashcards");
  });

  it("redirects /flashcards to /login", async () => {
    const res = await proxy(makeRequest("/flashcards"));
    expect(res.status).toBe(307);
    expect(location(res)).toContain("/login");
  });

  it("redirects /graph/123 to /login", async () => {
    const res = await proxy(makeRequest("/graph/123"));
    expect(res.status).toBe(307);
    expect(location(res)).toContain("/login");
  });

  it("redirects /settings to /login", async () => {
    const res = await proxy(makeRequest("/settings"));
    expect(res.status).toBe(307);
    expect(location(res)).toContain("/login");
  });

  it("allows /login through when no token", async () => {
    const res = await proxy(makeRequest("/login"));
    expect(res.status).toBe(200);
  });

  it("allows /register through when no token", async () => {
    const res = await proxy(makeRequest("/register"));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Authenticated user
// ---------------------------------------------------------------------------

describe("proxy — authenticated user", () => {
  const TOKEN = "any-non-empty-token";

  it("passes / through with a session token", async () => {
    const res = await proxy(makeRequest("/", TOKEN));
    expect(res.status).toBe(200);
  });

  it("passes /flashcards through with a session token", async () => {
    const res = await proxy(makeRequest("/flashcards", TOKEN));
    expect(res.status).toBe(200);
  });

  it("redirects /login to / when already authenticated", async () => {
    const res = await proxy(makeRequest("/login", TOKEN));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("http://localhost:3000/");
  });

  it("redirects /register to / when already authenticated", async () => {
    const res = await proxy(makeRequest("/register", TOKEN));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("http://localhost:3000/");
  });
});
