import { cookies } from 'next/headers';
import { signJwt, verifyJwt, type SessionPayload } from './jwt';
import { SIGNED_IN_COOKIE, SIGNED_IN_COOKIE_OPTIONS, SIGNED_IN_VALUE } from './signed-in-cookie';

const SESSION_COOKIE_NAME = 'session';

export async function setSession(payload: SessionPayload) {
  const token = await signJwt(payload);
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  cookieStore.set(SIGNED_IN_COOKIE, SIGNED_IN_VALUE, SIGNED_IN_COOKIE_OPTIONS);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }
  
  return verifyJwt(sessionCookie.value);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(SIGNED_IN_COOKIE);
}
