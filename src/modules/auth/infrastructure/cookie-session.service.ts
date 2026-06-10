import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import type { SessionCookieReader } from '../domain/ports/session-cookie.port'

const COOKIE_NAME = 'flashmind_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export class CookieSessionReader implements SessionCookieReader {
  async read(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value ?? null
  }
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
