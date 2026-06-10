/**
 * Integration tests for subjects server actions.
 * Uses a dedicated test user in the real dev.db, cleaned up after the suite.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// Literal string required here — vi.mock factory is hoisted before variable initialization
vi.mock("@/lib/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-subjects-spec-001"),
}));

const TEST_USER_ID = "test-user-subjects-spec-001";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { PrismaClient } from "@/generated/prisma/client";
import { createSubject, getSubjects } from "./subjects";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await prisma.$connect();
  await prisma.usuario.upsert({
    where: { id: TEST_USER_ID },
    create: { id: TEST_USER_ID, nome: "Subjects Test User", email: "subjects-spec@flashmind.test", senhaHash: "hash" },
    update: {},
  });
});

afterAll(async () => {
  // Cascade deletes: assuntos → topicos → conceitos
  await prisma.assunto.deleteMany({ where: { usuarioId: TEST_USER_ID } });
  await prisma.topico.deleteMany({ where: { usuarioId: TEST_USER_ID } });
  await prisma.conceito.deleteMany({ where: { usuarioId: TEST_USER_ID } });
  await prisma.usuario.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// createSubject
// ---------------------------------------------------------------------------

describe("createSubject", () => {
  it("creates a subject and returns its id", async () => {
    const result = await createSubject("Direito Constitucional", "Fundamentos");
    expect(result.id).toBeTruthy();

    const row = await prisma.assunto.findUnique({ where: { id: result.id } });
    expect(row?.nome).toBe("Direito Constitucional");
    expect(row?.usuarioId).toBe(TEST_USER_ID);
  });

  it("stores description when provided", async () => {
    const { id } = await createSubject("Economia", "Micro e macro");
    const row = await prisma.assunto.findUnique({ where: { id } });
    expect(row?.descricao).toBe("Micro e macro");
  });

  it("stores null description when omitted", async () => {
    const { id } = await createSubject("Física");
    const row = await prisma.assunto.findUnique({ where: { id } });
    expect(row?.descricao).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSubjects
// ---------------------------------------------------------------------------

describe("getSubjects", () => {
  it("returns subjects belonging to the current user", async () => {
    await createSubject("Matemática");
    const list = await getSubjects();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.id && s.nome)).toBe(true);
  });

  it("does not leak subjects from other users", async () => {
    const other = await prisma.usuario.create({
      data: { nome: "Other", email: "other-subjects-spec@flashmind.test", senhaHash: "h" },
    });
    await prisma.assunto.create({ data: { nome: "Segredo Alheio", usuarioId: other.id } });

    const list = await getSubjects();
    expect(list.some((s) => s.nome === "Segredo Alheio")).toBe(false);

    // cleanup
    await prisma.assunto.deleteMany({ where: { usuarioId: other.id } });
    await prisma.usuario.delete({ where: { id: other.id } });
  });

  it("returns subjects sorted alphabetically by name", async () => {
    const names = (await getSubjects()).map((s) => s.nome);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

