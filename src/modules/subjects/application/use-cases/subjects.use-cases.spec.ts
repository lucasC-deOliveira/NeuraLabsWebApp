import { vi, describe, it, expect, beforeEach } from "vitest";
import { CreateSubjectUseCase } from "./create-subject.use-case";
import { CreateTopicUseCase } from "./create-topic.use-case";
import { CreateConceptUseCase } from "./create-concept.use-case";
import { ListSubjectsUseCase } from "./list-subjects.use-case";
import type { SubjectRepository } from "../../domain/ports/subject-repository.port";
import { Subject } from "../../domain/entities/subject.entity";
import { Topic } from "../../domain/entities/topic.entity";
import { Concept } from "../../domain/entities/concept.entity";

const makeSubject = (id = "s1") =>
  Subject.create({ id, name: "Direito", description: null, userId: "u1" });

const makeTopic = (id = "t1") =>
  Topic.create({ id, name: "Contratos", description: null, userId: "u1" });

const makeConcept = (id = "c1") =>
  Concept.create({ id, name: "Oferta", description: null, userId: "u1" });

const repo: SubjectRepository = {
  createSubject: vi.fn(),
  createTopic: vi.fn(),
  createConcept: vi.fn(),
  listSubjects: vi.fn(),
  listTopics: vi.fn(),
  listConcepts: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("CreateSubjectUseCase", () => {
  it("delegates to repository and returns id", async () => {
    vi.mocked(repo.createSubject).mockResolvedValue(makeSubject("s-new"));
    const result = await new CreateSubjectUseCase(repo).execute({ name: "Direito", userId: "u1" });
    expect(result.id).toBe("s-new");
    expect(repo.createSubject).toHaveBeenCalledWith({ name: "Direito", description: null, userId: "u1" });
  });

  it("passes description when provided", async () => {
    vi.mocked(repo.createSubject).mockResolvedValue(makeSubject());
    await new CreateSubjectUseCase(repo).execute({ name: "Direito", description: "Desc", userId: "u1" });
    expect(repo.createSubject).toHaveBeenCalledWith(expect.objectContaining({ description: "Desc" }));
  });

  // Mutation: undefined description defaults to null
  it("defaults description to null when omitted", async () => {
    vi.mocked(repo.createSubject).mockResolvedValue(makeSubject());
    await new CreateSubjectUseCase(repo).execute({ name: "Direito", userId: "u1" });
    expect(repo.createSubject).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });
});

describe("CreateTopicUseCase", () => {
  it("creates topic with optional subjectId", async () => {
    vi.mocked(repo.createTopic).mockResolvedValue(makeTopic("t-new"));
    const result = await new CreateTopicUseCase(repo).execute({ name: "Contratos", userId: "u1", subjectId: "s1" });
    expect(result.id).toBe("t-new");
    expect(repo.createTopic).toHaveBeenCalledWith(expect.objectContaining({ subjectId: "s1" }));
  });

  it("creates topic without subjectId", async () => {
    vi.mocked(repo.createTopic).mockResolvedValue(makeTopic());
    await new CreateTopicUseCase(repo).execute({ name: "Contratos", userId: "u1" });
    expect(repo.createTopic).toHaveBeenCalledWith(expect.objectContaining({ subjectId: undefined }));
  });
});

describe("CreateConceptUseCase", () => {
  it("creates concept with optional topicId", async () => {
    vi.mocked(repo.createConcept).mockResolvedValue(makeConcept("c-new"));
    const result = await new CreateConceptUseCase(repo).execute({ name: "Oferta", userId: "u1", topicId: "t1" });
    expect(result.id).toBe("c-new");
    expect(repo.createConcept).toHaveBeenCalledWith(expect.objectContaining({ topicId: "t1" }));
  });
});

describe("ListSubjectsUseCase", () => {
  it("returns mapped DTOs", async () => {
    vi.mocked(repo.listSubjects).mockResolvedValue([makeSubject("s1"), makeSubject("s2")]);
    const result = await new ListSubjectsUseCase(repo).execute("u1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "s1", name: "Direito", description: null });
  });

  it("passes userId to repository", async () => {
    vi.mocked(repo.listSubjects).mockResolvedValue([]);
    await new ListSubjectsUseCase(repo).execute("user-99");
    expect(repo.listSubjects).toHaveBeenCalledWith("user-99");
  });

  it("returns empty array when no subjects", async () => {
    vi.mocked(repo.listSubjects).mockResolvedValue([]);
    const result = await new ListSubjectsUseCase(repo).execute("u1");
    expect(result).toEqual([]);
  });
});
