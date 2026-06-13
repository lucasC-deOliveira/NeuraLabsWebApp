import { describe, it, expect } from "vitest";
import { buildAuthUrl, createPkce, randomState, DESKTOP_OAUTH_REDIRECT } from "./desktop-oauth";

describe("desktop-oauth", () => {
  it("PKCE gera verifier e challenge base64url distintos", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier).not.toBe(challenge);
  });

  it("buildAuthUrl(google) usa o endpoint, redirect de loopback e PKCE", () => {
    const url = new URL(buildAuthUrl("google", { clientId: "gid", state: "s1", codeChallenge: "ch" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("gid");
    expect(url.searchParams.get("redirect_uri")).toBe(DESKTOP_OAUTH_REDIRECT);
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("s1");
  });

  it("buildAuthUrl(github) usa o endpoint e scope user:email", () => {
    const url = new URL(buildAuthUrl("github", { clientId: "ghid", state: "s2" }));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("ghid");
    expect(url.searchParams.get("redirect_uri")).toBe(DESKTOP_OAUTH_REDIRECT);
    expect(url.searchParams.get("scope")).toBe("user:email");
  });

  it("randomState é hex não-vazio", () => {
    expect(randomState()).toMatch(/^[0-9a-f]{32}$/);
  });
});
