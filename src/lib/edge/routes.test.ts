import { describe, expect, it } from 'vitest';
import { classifyPublicRoute, isPublicApiPath, isStaticAssetPath } from './routes';

describe('public route classification', () => {
  it('keeps authenticated and admin traffic on the Next server', () => {
    expect(classifyPublicRoute('GET', '/api/auth/me')).toEqual({ kind: 'app' });
    expect(classifyPublicRoute('GET', '/api/favorites')).toEqual({ kind: 'app' });
    expect(classifyPublicRoute('POST', '/api/gifs/trending')).toEqual({ kind: 'app' });
    expect(classifyPublicRoute('GET', '/admin')).toEqual({ kind: 'app' });
    expect(classifyPublicRoute('GET', '/admin/categories')).toEqual({ kind: 'app' });
  });

  it('serves public documents from static shells', () => {
    expect(classifyPublicRoute('GET', '/')).toEqual({ kind: 'shell', assetPath: '/' });
    expect(classifyPublicRoute('GET', '/search')).toEqual({ kind: 'shell', assetPath: '/search' });
    expect(classifyPublicRoute('GET', '/login')).toEqual({ kind: 'shell', assetPath: '/login' });
    expect(classifyPublicRoute('GET', '/favorites')).toEqual({ kind: 'shell', assetPath: '/favorites' });
    expect(classifyPublicRoute('GET', '/gif/123')).toEqual({ kind: 'shell', assetPath: '/gif/shell' });
    expect(classifyPublicRoute('GET', '/category/funny-cats/')).toEqual({
      kind: 'shell',
      assetPath: '/category/shell',
    });
    expect(classifyPublicRoute('GET', '/embed/abc_1')).toEqual({ kind: 'shell', assetPath: '/embed/shell' });
  });

  it('rejects path segments that could escape the shell', () => {
    expect(classifyPublicRoute('GET', '/gif/../admin')).toEqual({ kind: 'app' });
    expect(classifyPublicRoute('GET', '/gif/a/b')).toEqual({ kind: 'app' });
    expect(isPublicApiPath('/api/gifs/../../admin')).toBe(false);
  });

  it('recognizes the read-only API surface', () => {
    expect(isPublicApiPath('/api/gifs/trending')).toBe(true);
    expect(isPublicApiPath('/api/gifs/categories')).toBe(true);
    expect(isPublicApiPath('/api/gifs/42')).toBe(true);
    expect(isPublicApiPath('/api/categories/reactions')).toBe(true);
    expect(isPublicApiPath('/api/auth/login')).toBe(false);
    expect(isStaticAssetPath('/_next/static/chunk.js')).toBe(true);
    expect(isStaticAssetPath('/robots.txt')).toBe(true);
    expect(isStaticAssetPath('/gif/42')).toBe(false);
  });
});
