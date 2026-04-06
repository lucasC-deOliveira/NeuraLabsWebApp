// ---------------------------------------------------------------------------
// Auth API — login, register, logout
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";

// ---------------------------------------------------------------------------
// POST /api/auth — all auth actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "register") {
      return handleRegister(body);
    }

    if (action === "login") {
      return handleLogin(body);
    }

    if (action === "logout") {
      return handleLogout();
    }

    return NextResponse.json({ error: "Acao desconhecida" }, { status: 400 });
  } catch (err) {
    console.error("Auth API error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

async function handleRegister(body: Record<string, string>) {
  const { nome, email, senha } = body;

  if (!nome?.trim() || !email?.trim() || !senha) {
    return NextResponse.json(
      { error: "Nome, email e senha sao obrigatorios" },
      { status: 400 },
    );
  }

  if (senha.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter no minimo 6 caracteres" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json(
      { error: "Email invalido" },
      { status: 400 },
    );
  }

  const exists = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Email ja esta em uso" },
      { status: 409 },
    );
  }

  const senhaHash = await hashPassword(senha);

  const user = await prisma.usuario.create({
    data: {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash,
    },
    select: { id: true, nome: true, email: true },
  });

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({
    success: true,
    user,
  });
  await setSessionCookie(token);

  return response;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

async function handleLogin(body: Record<string, string>) {
  const { email, senha } = body;

  if (!email?.trim() || !senha) {
    return NextResponse.json(
      { error: "Email e senha sao obrigatorios" },
      { status: 400 },
    );
  }

  const user = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, nome: true, email: true, senhaHash: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Email ou senha incorretos" },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(senha, user.senhaHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Email ou senha incorretos" },
      { status: 401 },
    );
  }

  // Update last access
  await prisma.usuario.update({
    where: { id: user.id },
    data: { ultimoAcesso: new Date() },
  });

  const { senhaHash: _pw, ...publicUser } = user;
  const token = await createSessionToken(user.id);
  const response = NextResponse.json({
    success: true,
    user: publicUser,
  });
  await setSessionCookie(token);

  return response;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

async function handleLogout() {
  const response = NextResponse.json({ success: true });
  await clearSessionCookie();
  return response;
}
