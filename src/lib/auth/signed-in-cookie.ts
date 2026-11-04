export const SIGNED_IN_COOKIE = 'signed_in';
export const SIGNED_IN_VALUE = '1';

export const SIGNED_IN_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export function hasSignedInCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader.split(';').some((part) => {
    const [name, value] = part.trim().split('=');
    return name === SIGNED_IN_COOKIE && value === SIGNED_IN_VALUE;
  });
}
