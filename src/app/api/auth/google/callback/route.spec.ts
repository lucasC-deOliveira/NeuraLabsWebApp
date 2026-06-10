/**
 * Integration tests for GET /api/auth/google/callback.
 * Uses real SQLite dev.db; outgoing HTTP to Google is intercepted via vi.stubGlobal.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

// Transitively required by @/lib/auth (cookies() from next/headers)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Intercept all outbound HTTP — no real Google calls during tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { GET } from "./route";

const prisma = new PrismaClient();

const TEST_EMAIL = "google-oauth-callback-test@flashmind.test";
const VALID_STATE = "valid-csrf-state-abc123";
const VALID_COOKIES = { oauth_state: VALID_STATE, oauth_callback_url: "/" };

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  process.env.AUTH_GOOGLE_ID = "test-google-client-id";
  process.env.AUTH_GOOGLE_SECRET = "test-google-client-secret";
  await prisma.$connect();
  await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(
  params: Record<string, string>,
  cookies: Record<string, string> = {},
): NextRequest {
  const url = new URL("http://localhost:3000/api/auth/google/callback");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(url.toString(), {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

function mockGoogleSuccess(
  email = TEST_EMAIL,
  name = "Google Test User",
): void {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "mock-access-token" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sub: "google-uid-123", email, name }),
    });
}

// ---------------------------------------------------------------------------
// Guard / error paths
// ---------------------------------------------------------------------------

describe("GET /api/auth/google/callback — error paths", () => {
  it("redirects to /login?error=oauth when code is missing", async () => {
    const res = await GET(req({ state: VALID_STATE }, VALID_COOKIES));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth when Google returns an error param", async () => {
    const res = await GET(
      req({ error: "access_denied", state: VALID_STATE }, VALID_COOKIES),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth on CSRF state mismatch", async () => {
    const res = await GET(
      req({ code: "code", state: "tampered-state" }, VALID_COOKIES),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth when state cookie is absent", async () => {
    const res = await GET(
      req({ code: "code", state: VALID_STATE }, { oauth_callback_url: "/" }),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth when token exchange returns HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "invalid_grant" }),
    });
    const res = await GET(
      req({ code: "bad-code", state: VALID_STATE }, VALID_COOKIES),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth when token response has no access_token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "invalid_client" }),
    });
    const res = await GET(
      req({ code: "code", state: VALID_STATE }, VALID_COOKIES),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("redirects to /login?error=oauth when userinfo endpoint fails", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const res = await GET(
      req({ code: "code", state: VALID_STATE }, VALID_COOKIES),
    );
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });
});

// ---------------------------------------------------------------------------
// Happy path — new user
// ---------------------------------------------------------------------------

describe("GET /api/auth/google/callback — new user", () => {
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
  });

  it("creates the user in the database", async () => {
    mockGoogleSuccess();
    await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    const user = await prisma.usuario.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();
    expect(user?.nome).toBe("Google Test User");
    expect(user?.email).toBe(TEST_EMAIL);
  });

  it("sets a valid httpOnly session cookie", async () => {
    mockGoogleSuccess();
    const res = await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    const session = res.cookies.get("flashmind_session");
    expect(session?.value).toBeTruthy();
    expect(session?.httpOnly).toBe(true);
  });

  it("redirects to the default callbackUrl /", async () => {
    mockGoogleSuccess();
    const res = await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/");
  });

  it("redirects to a custom callbackUrl", async () => {
    mockGoogleSuccess();
    const cookies = { oauth_state: VALID_STATE, oauth_callback_url: "/flashcards" };
    const res = await GET(req({ code: "code", state: VALID_STATE }, cookies));
    expect(res.headers.get("location")).toContain("/flashcards");
  });
});

// ---------------------------------------------------------------------------
// Happy path — existing user
// ---------------------------------------------------------------------------

describe("GET /api/auth/google/callback — existing user", () => {
  it("does not create a duplicate when user already exists", async () => {
    // First login
    mockGoogleSuccess();
    await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));

    // Second login with same email
    mockGoogleSuccess();
    await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));

    const count = await prisma.usuario.count({ where: { email: TEST_EMAIL } });
    expect(count).toBe(1);
  });

  it("still sets a session cookie for the existing user", async () => {
    mockGoogleSuccess();
    const res = await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    expect(res.cookies.get("flashmind_session")?.value).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Open redirect guard
// ---------------------------------------------------------------------------

describe("GET /api/auth/google/callback — open redirect guard", () => {
  it("falls back to / for an absolute callbackUrl", async () => {
    mockGoogleSuccess();
    const cookies = { oauth_state: VALID_STATE, oauth_callback_url: "https://evil.com" };
    const res = await GET(req({ code: "code", state: VALID_STATE }, cookies));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("falls back to / for a protocol-relative callbackUrl", async () => {
    mockGoogleSuccess();
    const cookies = { oauth_state: VALID_STATE, oauth_callback_url: "//evil.com" };
    const res = await GET(req({ code: "code", state: VALID_STATE }, cookies));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });
});

// ---------------------------------------------------------------------------
// Cookie cleanup after login
// ---------------------------------------------------------------------------

describe("GET /api/auth/google/callback — cookie cleanup", () => {
  it("clears oauth_state cookie after successful login", async () => {
    mockGoogleSuccess();
    const res = await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    expect(res.cookies.get("oauth_state")?.maxAge).toBe(0);
  });

  it("clears oauth_callback_url cookie after successful login", async () => {
    mockGoogleSuccess();
    const res = await GET(req({ code: "code", state: VALID_STATE }, VALID_COOKIES));
    expect(res.cookies.get("oauth_callback_url")?.maxAge).toBe(0);
  });
});
