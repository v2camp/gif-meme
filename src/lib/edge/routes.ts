const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;

const GIF_RESERVED = new Set(['trending', 'search', 'categories']);

export type PublicRoute =
  | { kind: 'api' }
  | { kind: 'shell'; assetPath: string }
  | { kind: 'app' };

export function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path || '/';
}

export function isStaticAssetPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path.startsWith('/_next/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|map|json|txt|xml|webmanifest)$/i.test(path)
  );
}

export function isPublicApiPath(pathname: string): boolean {
  const path = normalizePath(pathname);

  if (
    path === '/api/gifs/trending' ||
    path === '/api/gifs/search' ||
    path === '/api/gifs/categories' ||
    path === '/api/stickers/trending' ||
    path === '/api/stickers/search' ||
    path === '/api/categories'
  ) {
    return true;
  }

  const gif = /^\/api\/gifs\/([^/]+)$/.exec(path);
  if (gif && SAFE_SEGMENT.test(gif[1]) && !GIF_RESERVED.has(gif[1])) {
    return true;
  }

  const category = /^\/api\/categories\/([^/]+)$/.exec(path);
  return Boolean(category && SAFE_SEGMENT.test(category[1]));
}

export function shellAssetPath(pathname: string): string | null {
  const path = normalizePath(pathname);

  const gif = /^\/gif\/([^/]+)$/.exec(path);
  if (gif && SAFE_SEGMENT.test(gif[1])) {
    return '/gif/shell';
  }

  const category = /^\/category\/([^/]+)$/.exec(path);
  if (category && SAFE_SEGMENT.test(category[1])) {
    return '/category/shell';
  }

  const embed = /^\/embed\/([^/]+)$/.exec(path);
  if (embed && SAFE_SEGMENT.test(embed[1])) {
    return '/embed/shell';
  }

  if (path === '/' || path === '/search' || path === '/login' || path === '/favorites') {
    return path;
  }

  return null;
}

export function classifyPublicRoute(method: string, pathname: string): PublicRoute {
  if (method !== 'GET' && method !== 'HEAD') {
    return { kind: 'app' };
  }

  if (isPublicApiPath(pathname)) {
    return { kind: 'api' };
  }

  const assetPath = shellAssetPath(pathname);
  if (assetPath) {
    return { kind: 'shell', assetPath };
  }

  return { kind: 'app' };
}
