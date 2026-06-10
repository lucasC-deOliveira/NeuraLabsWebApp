// ---------------------------------------------------------------------------
// POST /api/auth — thin HTTP adapter; all business logic lives in the auth module
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server'
import { authContainer } from '@/modules/auth/container'
import {
  attachSessionCookie,
  clearSessionCookie,
} from '@/modules/auth/infrastructure/cookie-session.service'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  TooManyRequestsError,
} from '@/shared/errors/application.error'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, string>
    const { action } = body

    if (action === 'register') return await handleRegister(body)

    if (action === 'login') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown'
      return await handleLogin(body, ip)
    }

    if (action === 'logout') return await handleLogout()

    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }
    if (err instanceof TooManyRequestsError) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    console.error('Auth API error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

async function handleRegister(body: Record<string, string>): Promise<NextResponse> {
  const result = await authContainer.registerUser.execute({
    name: body.nome,
    email: body.email,
    password: body.senha,
  })
  const response = NextResponse.json({ success: true, user: result.user })
  attachSessionCookie(response, result.sessionToken)
  return response
}

async function handleLogin(body: Record<string, string>, ipAddress: string): Promise<NextResponse> {
  const result = await authContainer.loginUser.execute({
    email: body.email,
    password: body.senha,
    ipAddress,
  })
  const response = NextResponse.json({ success: true, user: result.user })
  attachSessionCookie(response, result.sessionToken)
  return response
}

async function handleLogout(): Promise<NextResponse> {
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
