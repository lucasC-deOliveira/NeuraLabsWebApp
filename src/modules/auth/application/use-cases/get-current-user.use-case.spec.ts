import { vi, describe, it, expect, beforeEach } from "vitest";
import { GetCurrentUserUseCase } from "./get-current-user.use-case";
import type { UserRepository } from "../../domain/ports/user-repository.port";
import type { SessionTokenService } from "../../domain/ports/session-token-service.port";
import type { SessionCookieReader } from "../../domain/ports/session-cookie.port";
import { User } from "../../domain/entities/user.entity";

const makeUser = () =>
  User.create({ id: "u1", name: "Ana", email: "ana@test.com", passwordHash: "h", createdAt: new Date(), lastAccessAt: null });

const repo: UserRepository = { findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn(), updateLastAccess: vi.fn() };
const tokenService: SessionTokenService = { sign: vi.fn(), verify: vi.fn() };
const cookieReader: SessionCookieReader = { read: vi.fn() };

describe("GetCurrentUserUseCase", () => {
  let uc: GetCurrentUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    uc = new GetCurrentUserUseCase(repo, tokenService, cookieReader);
  });

  it("returns null user when no cookie present", async () => {
    vi.mocked(cookieReader.read).mockResolvedValue(null);
    const result = await uc.execute();
    expect(result.user).toBeNull();
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it("returns null user when token is invalid", async () => {
    vi.mocked(cookieReader.read).mockResolvedValue("bad-token");
    vi.mocked(tokenService.verify).mockResolvedValue(null);
    const result = await uc.execute();
    expect(result.user).toBeNull();
  });

  it("returns null when user not found in db", async () => {
    vi.mocked(cookieReader.read).mockResolvedValue("valid-token");
    vi.mocked(tokenService.verify).mockResolvedValue("u1");
    vi.mocked(repo.findById).mockResolvedValue(null);
    const result = await uc.execute();
    expect(result.user).toBeNull();
  });

  it("returns public profile when session is valid", async () => {
    vi.mocked(cookieReader.read).mockResolvedValue("valid-token");
    vi.mocked(tokenService.verify).mockResolvedValue("u1");
    vi.mocked(repo.findById).mockResolvedValue(makeUser());
    const result = await uc.execute();
    expect(result.user).toEqual({ id: "u1", name: "Ana", email: "ana@test.com" });
  });
});
