/**
 * Unit tests for GET /api/auth/google (OAuth initiation).
 * No mocks needed — NextRequest/NextResponse work in plain Node.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

beforeAll(() => {
  process.env.AUTH_GOOGLE_ID = "test-google-client-id";
});

function req(qs = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/auth/google${qs}`);
}

function redirectUrl(res: Response): URL {
  return new URL(res.headers.get("location")!);
}

// ---------------------------------------------------------------------------
// Redirect target
// ---------------------------------------------------------------------------

describe("GET /api/auth/google — redirect URL", () => {
  it("redirects to Google authorization endpoint", async () => {
    const res = await GET(req());
    expect(res.status).toBe(307);
    expect(redirectUrl(res).hostname).toBe("accounts.google.com");
    expect(redirectUrl(res).pathname).toBe("/o/oauth2/v2/auth");
  });

  it("includes the correct client_id", async () => {
    const res = await GET(req());
    expect(redirectUrl(res).searchParams.get("client_id")).toBe(
      "test-google-client-id",
    );
  });

  it("sets response_type=code", async () => {
    const res = await GET(req());
    expect(redirectUrl(res).searchParams.get("response_type")).toBe("code");
  });

  it("requests openid email profile scope", async () => {
    const res = await GET(req());
    expect(redirectUrl(res).searchParams.get("scope")).toBe(
      "openid email profile",
    );
  });

  it("includes the correct redirect_uri", async () => {
    const res = await GET(req());
    expect(redirectUrl(res).searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback",
    );
  });

  it("includes a non-empty state parameter", async () => {
    const res = await GET(req());
    expect(redirectUrl(res).searchParams.get("state")).toBeTruthy();
  });

  it("state param matches oauth_state cookie", async () => {
    const res = await GET(req());
    const urlState = redirectUrl(res).searchParams.get("state");
    const cookieState = res.cookies.get("oauth_state")?.value;
    expect(urlState).toBe(cookieState);
  });
});

// ---------------------------------------------------------------------------
// callbackUrl validation (open redirect guard)
// ---------------------------------------------------------------------------

describe("GET /api/auth/google — callbackUrl cookie", () => {
  it("defaults to / when callbackUrl is absent", async () => {
    const res = await GET(req());
    expect(res.cookies.get("oauth_callback_url")?.value).toBe("/");
  });

  it("stores a valid relative callbackUrl", async () => {
    const res = await GET(req("?callbackUrl=/dashboard"));
    expect(res.cookies.get("oauth_callback_url")?.value).toBe("/dashboard");
  });

  it("rejects absolute URL and falls back to /", async () => {
    const res = await GET(req("?callbackUrl=https://evil.com"));
    expect(res.cookies.get("oauth_callback_url")?.value).toBe("/");
  });

  it("rejects protocol-relative URL and falls back to /", async () => {
    const res = await GET(req("?callbackUrl=//evil.com/steal"));
    expect(res.cookies.get("oauth_callback_url")?.value).toBe("/");
  });
});

// ---------------------------------------------------------------------------
// Cookie security flags
// ---------------------------------------------------------------------------

describe("GET /api/auth/google — cookie flags", () => {
  it("oauth_callback_url is httpOnly", async () => {
    const res = await GET(req());
    expect(res.cookies.get("oauth_callback_url")?.httpOnly).toBe(true);
  });

  it("oauth_state is httpOnly", async () => {
    const res = await GET(req());
    expect(res.cookies.get("oauth_state")?.httpOnly).toBe(true);
  });

  it("both cookies expire within 5 minutes", async () => {
    const res = await GET(req());
    expect(res.cookies.get("oauth_callback_url")?.maxAge).toBeLessThanOrEqual(300);
    expect(res.cookies.get("oauth_state")?.maxAge).toBeLessThanOrEqual(300);
  });
});
