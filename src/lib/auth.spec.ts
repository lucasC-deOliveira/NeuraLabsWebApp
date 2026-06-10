import { vi, describe, it, expect, beforeEach } from "vitest";

// Mocks must be declared before any imports that trigger the module
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((path: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;push;${path};`,
    });
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: { findUnique: vi.fn() },
  },
}));

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  getSessionUserId,
  requireUserId,
  setSessionCookieResponse,
} from "./auth";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockCookieValue(value: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue(value ? { name: "flashmind_session", value } : undefined),
  } as ReturnType<typeof cookies> extends Promise<infer T> ? T : never);
}

// ---------------------------------------------------------------------------
// hashPassword / verifyPassword
// ---------------------------------------------------------------------------

describe("hashPassword / verifyPassword", () => {
  it("produces a bcrypt hash string", async () => {
    const h = await hashPassword("secret123");
    expect(h).toMatch(/^\$2[aby]\$/);
  });

  it("verifies correct password against its hash", async () => {
    const h = await hashPassword("correct");
    expect(await verifyPassword("correct", h)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const h = await hashPassword("correct");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("hashing is non-deterministic (different salts)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// createSessionToken
// ---------------------------------------------------------------------------

describe("createSessionToken", () => {
  it("returns a three-part JWT string", async () => {
    const token = await createSessionToken("user-1");
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes userId as the 'sub' claim", async () => {
    const token = await createSessionToken("user-abc");
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
    expect(payload.sub).toBe("user-abc");
  });

  it("sets a future expiration", async () => {
    const token = await createSessionToken("user-1");
    const payloadBase64 = token.split(".")[1];
    const { exp, iat } = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
    expect(exp).toBeGreaterThan(iat);
    expect(exp - iat).toBe(7 * 24 * 60 * 60); // 7 days
  });
});

// ---------------------------------------------------------------------------
// getSessionUserId
// ---------------------------------------------------------------------------

describe("getSessionUserId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when cookie is absent", async () => {
    mockCookieValue(undefined);
    expect(await getSessionUserId()).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    mockCookieValue("not.a.jwt");
    expect(await getSessionUserId()).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    // Build a JWT with a different key so signature verification fails
    const { SignJWT } = await import("jose");
    const wrongKey = new TextEncoder().encode("different-secret");
    const badToken = await new SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(wrongKey);

    mockCookieValue(badToken);
    expect(await getSessionUserId()).toBeNull();
  });

  it("returns the userId for a valid session token", async () => {
    const token = await createSessionToken("user-xyz");
    mockCookieValue(token);
    expect(await getSessionUserId()).toBe("user-xyz");
  });
});

// ---------------------------------------------------------------------------
// requireUserId
// ---------------------------------------------------------------------------

describe("requireUserId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /login when no session exists", async () => {
    mockCookieValue(undefined);
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("returns the userId when the session is valid", async () => {
    const token = await createSessionToken("user-123");
    mockCookieValue(token);
    expect(await requireUserId()).toBe("user-123");
  });
});

// ---------------------------------------------------------------------------
// setSessionCookieResponse
// ---------------------------------------------------------------------------

describe("setSessionCookieResponse", () => {
  it("attaches flashmind_session cookie to the response", async () => {
    const response = NextResponse.json({ ok: true });
    const token = await createSessionToken("user-1");
    setSessionCookieResponse(response, token);

    const cookie = response.cookies.get("flashmind_session");
    expect(cookie?.value).toBe(token);
  });

  it("sets httpOnly flag", async () => {
    const response = NextResponse.json({});
    setSessionCookieResponse(response, "tok");
    const cookie = response.cookies.get("flashmind_session");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("sets sameSite to lax", async () => {
    const response = NextResponse.json({});
    setSessionCookieResponse(response, "tok");
    const cookie = response.cookies.get("flashmind_session");
    expect(cookie?.sameSite).toBe("lax");
  });
});
