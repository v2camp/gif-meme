import { getPrewarmUrls } from './url-whitelist';
import { getAppBaseUrl } from '@/lib/runtime/base-url';

export interface PrewarmResult {
  total: number;
  succeeded: number;
  failed: number;
  failedUrls: string[];
  durationMs: number;
}

type CategoryRaw = {
  slug?: unknown;
  name?: unknown;
  title?: unknown;
  category?: unknown;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseCategorySlugs(payload: unknown): string[] {
  const data = payload as { data?: unknown } | undefined;
  const nested = data?.data as { data?: unknown } | undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(nested?.data)
      ? nested.data
      : Array.isArray(data?.data)
        ? data.data
        : [];

  const slugs = new Set<string>();
  for (const item of items as CategoryRaw[]) {
    const directSlug = typeof item.slug === 'string' ? item.slug.trim() : '';
    if (directSlug) {
      slugs.add(directSlug);
      continue;
    }

    const label = [item.name, item.title, item.category].find((v) => typeof v === 'string') as
      | string
      | undefined;
    if (!label) continue;
    const generated = slugify(label);
    if (generated) {
      slugs.add(generated);
    }
  }

  return [...slugs];
}

async function fetchCategorySlugs(baseUrl: string): Promise<string[]> {
  const categoriesUrl = `${baseUrl}/api/categories`;

  try {
    const response = await fetch(categoriesUrl);
    if (!response.ok) {
      console.error('Prewarm categories fetch failed:', categoriesUrl, response.status);
      return [];
    }

    const payload = await response.json();
    return parseCategorySlugs(payload);
  } catch (error) {
    console.error('Prewarm categories fetch failed:', categoriesUrl, error);
    return [];
  }
}

export async function handleScheduled(env: CloudflareEnv): Promise<PrewarmResult> {
  const startedAt = Date.now();
  const baseUrl = (env as unknown as Record<string, unknown>).APP_BASE_URL as string | undefined;
  const appBaseUrl = (baseUrl && baseUrl.trim()) || getAppBaseUrl();

  const categorySlugs = await fetchCategorySlugs(appBaseUrl);
  const urls = getPrewarmUrls(appBaseUrl, categorySlugs);

  const failedUrls: string[] = [];
  const settled = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    })
  );

  for (let i = 0; i < settled.length; i += 1) {
    const item = settled[i];
    if (item && item.status === 'rejected') {
      const url = urls[i];
      failedUrls.push(url);
      console.error('Prewarm URL failed:', url, item.reason);
    }
  }

  const failed = failedUrls.length;
  const total = urls.length;
  const succeeded = total - failed;

  return {
    total,
    succeeded,
    failed,
    failedUrls,
    durationMs: Date.now() - startedAt,
  };
}
