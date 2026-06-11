import { describe, it, expect } from "vitest";
import { JwtSessionTokenService } from "./jwt-session-token-service.adapter";

const SECRET = "vitest-test-secret-not-for-production";

describe("JwtSessionTokenService", () => {
  it("signs and verifies a userId round-trip", async () => {
    const svc = new JwtSessionTokenService(SECRET);
    const token = await svc.sign("user-42");
    const userId = await svc.verify(token);
    expect(userId).toBe("user-42");
  });

  it("returns null for a tampered token", async () => {
    const svc = new JwtSessionTokenService(SECRET);
    const result = await svc.verify("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("returns null for a token signed with different secret", async () => {
    const svc1 = new JwtSessionTokenService("secret-A");
    const svc2 = new JwtSessionTokenService("secret-B");
    const token = await svc1.sign("user-1");
    const result = await svc2.verify(token);
    expect(result).toBeNull();
  });

  it("returns null for empty string", async () => {
    const svc = new JwtSessionTokenService(SECRET);
    const result = await svc.verify("");
    expect(result).toBeNull();
  });

  // Mutation: token from one user should not match another user's id
  it("sign embeds the correct userId in the payload", async () => {
    const svc = new JwtSessionTokenService(SECRET);
    const token = await svc.sign("user-99");
    const userId = await svc.verify(token);
    expect(userId).toBe("user-99");
    expect(userId).not.toBe("user-1");
  });
});
