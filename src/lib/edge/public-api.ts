import { CACHE_TTL } from '@/lib/cache/ttl-config';
import { KlipyProvider } from '@/lib/klipy/provider';
import { listCategories, loadCategory, type CatalogEnv } from '@/lib/edge/catalog';
import { isPublicApiPath, normalizePath } from '@/lib/edge/routes';

const MAX_PAGE = 20;
const MAX_PER_PAGE = 24;

type JsonResult = {
  status: number;
  body: unknown;
  ttl: number;
};

function clamp(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function getCache(): Cache | undefined {
  const storage = (globalThis as { caches?: { default?: Cache } }).caches;
  return storage?.default;
}

function jsonResponse(body: unknown, status: number, ttlSeconds = 0): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
  });
  headers.set(
    'cache-control',
    status === 200 && ttlSeconds > 0 ? `public, max-age=60, s-maxage=${ttlSeconds}` : 'no-store'
  );
  return new Response(JSON.stringify(body), { status, headers });
}

async function withJsonCache(keyUrl: string, produce: () => Promise<JsonResult>): Promise<Response> {
  const cache = getCache();
  const key = new Request(keyUrl, { method: 'GET' });

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        return hit;
      }
    } catch (error) {
      console.error('Formatted response cache read failed:', error);
    }
  }

  let produced: JsonResult;
  try {
    produced = await produce();
  } catch (error) {
    console.error('Public API failed:', error);
    return jsonResponse({ error: 'Failed to fetch' }, 500);
  }

  const response = jsonResponse(produced.body, produced.status, produced.ttl);
  if (cache && produced.status === 200 && produced.ttl > 0) {
    try {
      await cache.put(key, response.clone());
    } catch (error) {
      console.error('Formatted response cache write failed:', error);
    }
  }
  return response;
}

function providerFor(env: CatalogEnv): KlipyProvider | null {
  if (!env.KLIPY_API_KEY) {
    return null;
  }
  return new KlipyProvider(env.KLIPY_API_KEY);
}

function cacheKey(origin: string, path: string, params: Record<string, string>): string {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function handlePublicApi(request: Request, env: CatalogEnv): Promise<Response | null> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  if (!isPublicApiPath(path)) {
    return null;
  }

  const response = await dispatch(url, path, env);
  if (request.method === 'HEAD') {
    return new Response(null, { status: response.status, headers: response.headers });
  }
  return response;
}

async function dispatch(url: URL, path: string, env: CatalogEnv): Promise<Response> {
  const provider = providerFor(env);
  const page = clamp(url.searchParams.get('page'), 1, MAX_PAGE, 1);
  const perPage = clamp(url.searchParams.get('per_page'), 1, MAX_PER_PAGE, 20);

  if (path === '/api/categories') {
    return withJsonCache(cacheKey(url.origin, path, {}), async () => ({
      status: 200,
      body: await listCategories(env),
      ttl: CACHE_TTL.categories,
    }));
  }

  const categoryMatch = /^\/api\/categories\/([^/]+)$/.exec(path);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    return withJsonCache(cacheKey(url.origin, path, {}), async () => {
      const category = await loadCategory(env, slug);
      if (category.notFound) {
        return { status: 404, body: { error: 'Category not found' }, ttl: 0 };
      }
      const { notFound: _notFound, ...body } = category;
      return { status: 200, body, ttl: CACHE_TTL.trending };
    });
  }

  if (!provider) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  if (path === '/api/gifs/trending') {
    return withJsonCache(cacheKey(url.origin, path, { page: String(page), per_page: String(perPage) }), async () => ({
      status: 200,
      body: await provider.trending(page, perPage),
      ttl: CACHE_TTL.trending,
    }));
  }

  if (path === '/api/stickers/trending') {
    return withJsonCache(cacheKey(url.origin, path, { page: String(page), per_page: String(perPage) }), async () => ({
      status: 200,
      body: await provider.trendingStickers(page, perPage),
      ttl: CACHE_TTL.stickers,
    }));
  }

  if (path === '/api/gifs/search' || path === '/api/stickers/search') {
    const query = (url.searchParams.get('q') || '').trim();
    if (!query) {
      return jsonResponse({ error: 'Missing query parameter "q"' }, 400);
    }
    const search = path.endsWith('/gifs/search')
      ? provider.search.bind(provider)
      : provider.searchStickers.bind(provider);
    return withJsonCache(
      cacheKey(url.origin, path, { q: query, page: String(page), per_page: String(perPage) }),
      async () => ({
        status: 200,
        body: await search(query, page, perPage),
        ttl: CACHE_TTL.search,
      })
    );
  }

  if (path === '/api/gifs/categories') {
    return withJsonCache(cacheKey(url.origin, path, {}), async () => ({
      status: 200,
      body: await provider.categories(),
      ttl: CACHE_TTL.categories,
    }));
  }

  const gifMatch = /^\/api\/gifs\/([^/]+)$/.exec(path);
  if (gifMatch) {
    const id = gifMatch[1];
    return withJsonCache(cacheKey(url.origin, path, {}), async () => {
      const gif = await provider.getById(id);
      if (!gif) {
        return { status: 404, body: { error: 'GIF not found' }, ttl: 0 };
      }
      return { status: 200, body: gif, ttl: CACHE_TTL.detail };
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
