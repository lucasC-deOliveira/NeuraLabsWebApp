/**
 * Integration tests for POST /api/auth (register / login / logout).
 * Uses the real SQLite dev.db with a dedicated test user cleaned up afterward.
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

// Mock next/headers so clearSessionCookie does not blow up outside Next.js runtime
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { POST } from "./route";
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

// Stable IDs so we can delete them reliably
const TEST_EMAIL = "integration-auth-test@neuralabs.test";
const TEST_NOME = "Auth Integration Test";
const TEST_SENHA = "senha-segura-123";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await prisma.$connect();
  // Ensure no leftover from a previous failed run
  await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedUser() {
  return prisma.usuario.create({
    data: {
      nome: TEST_NOME,
      email: TEST_EMAIL,
      senhaHash: await hashPassword(TEST_SENHA),
    },
  });
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

describe("POST /api/auth — register", () => {
  // Each register test starts fresh so there is no pre-existing user
  beforeEach(async () => {
    await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
  });
  it("creates user and returns 200 with user data", async () => {
    const res = await POST(post({ action: "register", nome: TEST_NOME, email: TEST_EMAIL, senha: TEST_SENHA }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user).not.toHaveProperty("senhaHash");
  });

  it("sets the session cookie on the response", async () => {
    const res = await POST(post({ action: "register", nome: TEST_NOME, email: TEST_EMAIL, senha: TEST_SENHA }));
    const cookie = res.cookies.get("neuralabs_session");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("returns 400 when nome is missing", async () => {
    const res = await POST(post({ action: "register", email: TEST_EMAIL, senha: TEST_SENHA }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(post({ action: "register", nome: TEST_NOME, email: TEST_EMAIL, senha: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(post({ action: "register", nome: TEST_NOME, email: "not-an-email", senha: TEST_SENHA }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when email is already in use", async () => {
    await seedUser();
    const res = await POST(post({ action: "register", nome: TEST_NOME, email: TEST_EMAIL, senha: TEST_SENHA }));
    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

describe("POST /api/auth — login", () => {
  beforeAll(async () => {
    // Previous register tests may have left a user; clean up first
    await prisma.usuario.deleteMany({ where: { email: TEST_EMAIL } });
    await seedUser();
  });

  it("returns 200 and session cookie for correct credentials", async () => {
    const res = await POST(post({ action: "login", email: TEST_EMAIL, senha: TEST_SENHA }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(TEST_EMAIL);

    const cookie = res.cookies.get("neuralabs_session");
    expect(cookie?.value).toBeTruthy();
  });

  it("does not expose senhaHash in the response", async () => {
    const res = await POST(post({ action: "login", email: TEST_EMAIL, senha: TEST_SENHA }));
    const body = await res.json();
    expect(body.user).not.toHaveProperty("senhaHash");
  });

  it("returns 401 for wrong password", async () => {
    const res = await POST(post({ action: "login", email: TEST_EMAIL, senha: "senha-errada" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await POST(post({ action: "login", email: "nobody@neuralabs.test", senha: TEST_SENHA }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(post({ action: "login", senha: TEST_SENHA }));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe("POST /api/auth — logout", () => {
  it("returns 200 with success true", async () => {
    const res = await POST(post({ action: "logout" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unknown action
// ---------------------------------------------------------------------------

describe("POST /api/auth — unknown action", () => {
  it("returns 400 for unrecognised action", async () => {
    const res = await POST(post({ action: "teleport" }));
    expect(res.status).toBe(400);
  });
});
