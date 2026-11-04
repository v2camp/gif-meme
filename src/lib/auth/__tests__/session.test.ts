import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSession, getSession, clearSession } from '../session';
import { signJwt } from '../jwt';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('../jwt', () => ({
  signJwt: vi.fn(),
  verifyJwt: vi.fn(),
}));

describe('session', () => {
  const mockCookies = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as any).mockResolvedValue(mockCookies);
  });

  it('setSession sets a cookie with the JWT', async () => {
    (signJwt as any).mockResolvedValue('mock-jwt-token');
    
    const payload = { userId: '123', email: 'test@example.com' };
    await setSession(payload);

    expect(signJwt).toHaveBeenCalledWith(payload);
    expect(mockCookies.set).toHaveBeenCalledWith(
      'session',
      'mock-jwt-token',
      expect.objectContaining({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    );
    expect(mockCookies.set).toHaveBeenCalledWith(
      'signed_in',
      '1',
      expect.objectContaining({
        httpOnly: false,
        path: '/',
      })
    );
  });

  it('getSession returns null if no cookie', async () => {
    mockCookies.get.mockReturnValue(undefined);
    
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('clearSession deletes the cookie', async () => {
    await clearSession();
    expect(mockCookies.delete).toHaveBeenCalledWith('session');
    expect(mockCookies.delete).toHaveBeenCalledWith('signed_in');
  });
});
