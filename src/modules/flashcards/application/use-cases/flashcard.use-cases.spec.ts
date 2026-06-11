import { vi, describe, it, expect, beforeEach } from "vitest";
import { CreateFlashcardUseCase, type SpacedRepetitionService, type KnowledgeNodeService } from "./create-flashcard.use-case";
import { ListFlashcardsUseCase } from "./list-flashcards.use-case";
import type { FlashcardRepository } from "../../domain/repositories/flashcard-repository";
import { Flashcard } from "../../domain/entities/flashcard";
import { SpacedRepetitionData } from "../../domain/value-objects/flashcard-spaced-data";

const past = new Date(Date.now() - 86_400_000);
const future = new Date(Date.now() + 86_400_000);

function makeFlashcard(id = "fc1") {
  const fc = Flashcard.create("Pergunta?", "Resposta.", "c1", "Conceito", "u1");
  const srd = SpacedRepetitionData.create(3, 7, future, past, 1);
  fc.setSpacedRepetition(srd);
  // override id for test purposes via cast
  (fc as any)._id = id;
  return fc;
}

const repo: FlashcardRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findAllByUserId: vi.fn(),
  delete: vi.fn(),
};

const srService: SpacedRepetitionService = {
  createSchedule: vi.fn(),
  calculateNextInterval: vi.fn(),
};

const nodeService: KnowledgeNodeService = {
  ensureFlashcardNodes: vi.fn(),
};

describe("CreateFlashcardUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(srService.createSchedule).mockReturnValue({ interval: 1, ease: 2.5, stage: 0 });
    vi.mocked(repo.save).mockResolvedValue(undefined);
    vi.mocked(nodeService.ensureFlashcardNodes).mockResolvedValue(undefined);
  });

  it("saves flashcard and returns flashcardId", async () => {
    const uc = new CreateFlashcardUseCase(repo, srService, nodeService);
    const result = await uc.execute({ pergunta: "O que é X?", resposta: "X é Y.", conceitoId: "c1", conceitoNome: "X", userId: "u1" });
    expect(result.flashcardId).toBeDefined();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("calls srService.createSchedule to schedule initial review", async () => {
    const uc = new CreateFlashcardUseCase(repo, srService, nodeService);
    await uc.execute({ pergunta: "Q?", resposta: "A.", conceitoId: "c1", conceitoNome: "X", userId: "u1" });
    expect(srService.createSchedule).toHaveBeenCalledTimes(1);
  });

  it("calls nodeService to create knowledge graph nodes", async () => {
    const uc = new CreateFlashcardUseCase(repo, srService, nodeService);
    await uc.execute({ pergunta: "Q?", resposta: "A.", conceitoId: "c1", conceitoNome: "X", userId: "u1" });
    expect(nodeService.ensureFlashcardNodes).toHaveBeenCalledWith("c1", expect.any(String));
  });
});

describe("ListFlashcardsUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps flashcards to DTOs", async () => {
    const fc = makeFlashcard();
    vi.mocked(repo.findAllByUserId).mockResolvedValue([fc]);
    const uc = new ListFlashcardsUseCase(repo);
    const result = await uc.execute({ userId: "u1" });
    expect(result).toHaveLength(1);
    expect(result[0].pergunta).toBe("Pergunta?");
    expect(result[0].resposta).toBe("Resposta.");
    expect(result[0].spacedRepetition).not.toBeNull();
  });

  it("passes filters to repository", async () => {
    vi.mocked(repo.findAllByUserId).mockResolvedValue([]);
    const uc = new ListFlashcardsUseCase(repo);
    await uc.execute({ userId: "u1", conceptId: "c1", topicId: "t1" });
    expect(repo.findAllByUserId).toHaveBeenCalledWith("u1", { conceptId: "c1", topicId: "t1" });
  });

  it("returns empty array when no flashcards", async () => {
    vi.mocked(repo.findAllByUserId).mockResolvedValue([]);
    const result = await new ListFlashcardsUseCase(repo).execute({ userId: "u1" });
    expect(result).toEqual([]);
  });

  it("maps null spacedRepetition to null in DTO", async () => {
    const fc = Flashcard.create("Q?", "A.", "c1", "X", "u1");
    vi.mocked(repo.findAllByUserId).mockResolvedValue([fc]);
    const result = await new ListFlashcardsUseCase(repo).execute({ userId: "u1" });
    expect(result[0].spacedRepetition).toBeNull();
  });
});
