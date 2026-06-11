import { vi, describe, it, expect, beforeEach } from "vitest";
import { DeleteNotaUseCase } from "./delete-nota.use-case";
import { GetNotaUseCase } from "./get-nota.use-case";
import type { NotaRepository } from "../../domain/repositories/nota-repository";
import { Nota } from "../../domain/entities/nota";

function makeNota(userId = "u1"): Nota {
  return Nota.restore({
    id: "nota-1",
    userId,
    titulo: "Aula 1",
    textoBruto: "# Soberania\nSoberania: O poder supremo",
    sections: [],
    conceitoIds: ["c1"],
    flashcardIds: [],
    createdAt: new Date("2024-01-01"),
  } as any);
}

const repo: NotaRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("DeleteNotaUseCase", () => {
  it("deletes nota when it belongs to the requesting user", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("u1"));
    const uc = new DeleteNotaUseCase(repo);
    await uc.execute("nota-1", "u1");
    expect(repo.delete).toHaveBeenCalledWith("nota-1");
  });

  it("throws when nota not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(new DeleteNotaUseCase(repo).execute("nota-x", "u1")).rejects.toThrow();
  });

  it("throws when nota belongs to a different user", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("other-user"));
    await expect(new DeleteNotaUseCase(repo).execute("nota-1", "u1")).rejects.toThrow();
  });

  // Mutation: must not delete if user check fails
  it("does not call delete when user mismatch", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("other-user"));
    await expect(new DeleteNotaUseCase(repo).execute("nota-1", "u1")).rejects.toThrow();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe("GetNotaUseCase", () => {
  it("returns mapped nota when found and owned by user", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("u1"));
    const result = await new GetNotaUseCase(repo).execute("nota-1", "u1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("nota-1");
    expect(result!.titulo).toBe("Aula 1");
    expect(result!.conceitoIds).toContain("c1");
  });

  it("returns null when nota not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    const result = await new GetNotaUseCase(repo).execute("nota-x", "u1");
    expect(result).toBeNull();
  });

  it("returns null when nota belongs to different user", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("other-user"));
    const result = await new GetNotaUseCase(repo).execute("nota-1", "u1");
    expect(result).toBeNull();
  });

  it("maps all expected fields to output", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeNota("u1"));
    const result = await new GetNotaUseCase(repo).execute("nota-1", "u1");
    expect(result).toMatchObject({
      id: expect.any(String),
      userId: "u1",
      textoBruto: expect.any(String),
      conceitoIds: expect.any(Array),
      flashcardIds: expect.any(Array),
      createdAt: expect.any(Date),
    });
  });
});
