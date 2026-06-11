import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginUserUseCase } from "./login-user.use-case";
import type { UserRepository } from "../../domain/ports/user-repository.port";
import type { PasswordHasher } from "../../domain/ports/password-hasher.port";
import type { SessionTokenService } from "../../domain/ports/session-token-service.port";
import type { RateLimiter } from "../../domain/ports/rate-limiter.port";
import { User } from "../../domain/entities/user.entity";
import { TooManyRequestsError, UnauthorizedError, ValidationError } from "@/shared/errors/application.error";

const makeUser = () =>
  User.create({
    id: "u1",
    name: "Lucas",
    email: "lucas@test.com",
    passwordHash: "hashedpass",
    createdAt: new Date(),
    lastAccessAt: null,
  });

const repo: UserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateLastAccess: vi.fn(),
};

const hasher: PasswordHasher = { hash: vi.fn(), verify: vi.fn() };
const tokenService: SessionTokenService = { sign: vi.fn(), verify: vi.fn() };
const rateLimiter: RateLimiter = { check: vi.fn(), reset: vi.fn() };

const VALID_INPUT = { email: "lucas@test.com", password: "correctpass", ipAddress: "1.2.3.4" };

describe("LoginUserUseCase", () => {
  let uc: LoginUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    uc = new LoginUserUseCase(repo, hasher, tokenService, rateLimiter);
    vi.mocked(rateLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());
    vi.mocked(hasher.verify).mockResolvedValue(true);
    vi.mocked(tokenService.sign).mockResolvedValue("session-token");
  });

  it("returns user and sessionToken on valid credentials", async () => {
    const result = await uc.execute(VALID_INPUT);
    expect(result.sessionToken).toBe("session-token");
    expect(result.user.id).toBe("u1");
  });

  it("normalises email to lowercase", async () => {
    await uc.execute({ ...VALID_INPUT, email: "  LUCAS@TEST.COM  " });
    expect(repo.findByEmail).toHaveBeenCalledWith("lucas@test.com");
  });

  it("throws ValidationError when email is empty", async () => {
    await expect(uc.execute({ ...VALID_INPUT, email: "" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when password is empty", async () => {
    await expect(uc.execute({ ...VALID_INPUT, password: "" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws TooManyRequestsError when rate limit exceeded", async () => {
    vi.mocked(rateLimiter.check).mockReturnValue({ allowed: false, retryAfter: 30 });
    await expect(uc.execute(VALID_INPUT)).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("throws UnauthorizedError when user not found", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    await expect(uc.execute(VALID_INPUT)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when password is wrong", async () => {
    vi.mocked(hasher.verify).mockResolvedValue(false);
    await expect(uc.execute(VALID_INPUT)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("resets rate limiter after successful login", async () => {
    await uc.execute(VALID_INPUT);
    expect(rateLimiter.reset).toHaveBeenCalledTimes(1);
  });

  it("updates last access after successful login", async () => {
    await uc.execute(VALID_INPUT);
    expect(repo.updateLastAccess).toHaveBeenCalledWith("u1");
  });

  // Mutation: ensure rate limiter key includes both ip and email
  it("includes ip and email in the rate limit key", async () => {
    await uc.execute(VALID_INPUT);
    const key = vi.mocked(rateLimiter.check).mock.calls[0][0];
    expect(key).toContain("1.2.3.4");
    expect(key).toContain("lucas@test.com");
  });
});
