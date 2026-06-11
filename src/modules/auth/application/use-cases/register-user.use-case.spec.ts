import { vi, describe, it, expect, beforeEach } from "vitest";
import { RegisterUserUseCase } from "./register-user.use-case";
import type { UserRepository } from "../../domain/ports/user-repository.port";
import type { PasswordHasher } from "../../domain/ports/password-hasher.port";
import type { SessionTokenService } from "../../domain/ports/session-token-service.port";
import { User } from "../../domain/entities/user.entity";
import { ConflictError, ValidationError } from "@/shared/errors/application.error";

const makeUser = (overrides = {}) =>
  User.create({
    id: "u1",
    name: "Ana",
    email: "ana@test.com",
    passwordHash: "hashed",
    createdAt: new Date(),
    lastAccessAt: null,
    ...overrides,
  });

const repo: UserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateLastAccess: vi.fn(),
};

const hasher: PasswordHasher = {
  hash: vi.fn(),
  verify: vi.fn(),
};

const tokenService: SessionTokenService = {
  sign: vi.fn(),
  verify: vi.fn(),
};

describe("RegisterUserUseCase", () => {
  let uc: RegisterUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    uc = new RegisterUserUseCase(repo, hasher, tokenService);
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.create).mockResolvedValue(makeUser());
    vi.mocked(hasher.hash).mockResolvedValue("hashed");
    vi.mocked(tokenService.sign).mockResolvedValue("token-abc");
  });

  it("creates user and returns sessionToken on valid input", async () => {
    const result = await uc.execute({ name: "Ana", email: "ANA@TEST.COM", password: "secure123" });
    expect(result.sessionToken).toBe("token-abc");
    expect(result.user.email).toBeDefined();
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("normalises email to lowercase before saving", async () => {
    await uc.execute({ name: "Ana", email: "  ANA@TEST.COM  ", password: "secure123" });
    expect(repo.findByEmail).toHaveBeenCalledWith("ana@test.com");
  });

  it("throws ValidationError when name is empty", async () => {
    await expect(uc.execute({ name: "", email: "a@b.com", password: "pass1234" }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when password is too short", async () => {
    await expect(uc.execute({ name: "Ana", email: "a@b.com", password: "short" }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError for invalid email format", async () => {
    await expect(uc.execute({ name: "Ana", email: "not-an-email", password: "secure123" }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ConflictError when email is already taken", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());
    await expect(uc.execute({ name: "Ana", email: "ana@test.com", password: "secure123" }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it("hashes password before persisting", async () => {
    await uc.execute({ name: "Ana", email: "ana@test.com", password: "secure123" });
    expect(hasher.hash).toHaveBeenCalledWith("secure123");
    const createCall = vi.mocked(repo.create).mock.calls[0][0];
    expect(createCall.passwordHash).toBe("hashed");
  });

  // Mutation guard: ensures undefined inputs don't crash (null-coalescing guards)
  it("throws ValidationError when name is undefined/null-ish", async () => {
    await expect(uc.execute({ name: null as any, email: "a@b.com", password: "pass1234" }))
      .rejects.toBeInstanceOf(ValidationError);
  });
});
