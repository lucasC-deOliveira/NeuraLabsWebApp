import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import type { SessionCookieReader } from '../domain/ports/session-cookie.port'
import { isDesktopApp } from '@/lib/runtime'

const COOKIE_NAME = 'neuralabs_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

// No desktop o app serve via http://127.0.0.1, então um cookie "Secure" não é
// salvo pelo navegador. Só marca Secure em produção web (https).
const useSecureCookie = () => process.env.NODE_ENV === 'production' && !isDesktopApp()

export class CookieSessionReader implements SessionCookieReader {
  async read(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value ?? null
  }
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: useSecureCookie(),
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: useSecureCookie(),
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
