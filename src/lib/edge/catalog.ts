import { mergeCategoryCards, type CategoryCardForMerge } from '@/lib/categories/merge';
import { KlipyProvider } from '@/lib/klipy/provider';
import type { KlipyAd, KlipyGif, KlipyPage } from '@/lib/klipy/types';

export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1Like {
  prepare(sql: string): D1StatementLike;
}

export interface CatalogEnv {
  KLIPY_API_KEY?: string;
  main_db?: D1Like;
  'main-db'?: D1Like;
}

export interface CategoryListItem {
  slug: string;
  label: string;
  seoTitle?: string | null;
}

export interface CategoryPageData {
  slug: string;
  label: string;
  searchQuery: string;
  categories: CategoryListItem[];
  items: KlipyGif[];
  ads: KlipyAd[];
  page: number;
  perPage: number;
  hasNext: boolean;
}

type CategoryRow = {
  slug: string;
  label: string;
  search_query: string | null;
  seo_title: string | null;
  is_active: number;
};

type CardRow = {
  id: string;
  position: number;
  image_url: string;
  image_name: string | null;
  link_url: string | null;
};

const EMPTY_PAGE: KlipyPage<KlipyGif> = {
  items: [],
  ads: [],
  page: 1,
  perPage: 20,
  hasNext: false,
};

export function formatCategoryName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

function getDb(env: CatalogEnv): D1Like | null {
  return env.main_db || env['main-db'] || null;
}

function getProvider(env: CatalogEnv): KlipyProvider | null {
  if (!env.KLIPY_API_KEY) {
    return null;
  }
  return new KlipyProvider(env.KLIPY_API_KEY);
}

function normalizeKlipyCategories(payload: unknown): CategoryListItem[] {
  const data = payload as { data?: unknown } | undefined;
  const nested = (data?.data as { data?: unknown } | undefined)?.data;
  const raw = Array.isArray(nested) ? nested : Array.isArray(data?.data) ? data.data : [];

  return raw
    .map((entry) => {
      const cat = entry as Record<string, unknown>;
      const label = String(cat.name || cat.title || cat.category || '');
      if (!label) {
        return null;
      }
      return { slug: slugify(label), label };
    })
    .filter((item): item is CategoryListItem => item !== null)
    .slice(0, 20);
}

export async function listCategories(env: CatalogEnv): Promise<CategoryListItem[]> {
  const db = getDb(env);

  if (db) {
    try {
      const result = await db
        .prepare(
          `SELECT slug, label, seo_title AS seoTitle
           FROM categories
           WHERE is_active = 1
           ORDER BY sort_order ASC`
        )
        .all<CategoryListItem>();
      return result.results ?? [];
    } catch (error) {
      console.error('Category list query failed:', error);
    }
  }

  const provider = getProvider(env);
  if (!provider) {
    return [];
  }

  try {
    return normalizeKlipyCategories(await provider.categories());
  } catch (error) {
    console.error('Klipy category list failed:', error);
    return [];
  }
}

async function loadCards(db: D1Like | null, slug: string): Promise<CategoryCardForMerge[]> {
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .prepare(
        `SELECT id, position, image_url, image_name, link_url
         FROM category_cards
         WHERE category_slug = ? AND is_active = 1
         ORDER BY position ASC, id ASC`
      )
      .bind(slug)
      .all<CardRow>();

    return (result.results ?? []).map((card) => ({
      id: card.id,
      position: card.position,
      imageUrl: card.image_url,
      imageName: card.image_name ?? '',
      linkUrl: card.link_url ?? undefined,
    }));
  } catch (error) {
    console.error('Category card query failed:', error);
    return [];
  }
}

export async function loadCategory(
  env: CatalogEnv,
  slug: string
): Promise<{ notFound: true } | ({ notFound: false } & CategoryPageData)> {
  if (!slug) {
    return { notFound: true };
  }

  const db = getDb(env);
  let record: CategoryRow | null = null;

  if (db) {
    try {
      record = await db
        .prepare(
          `SELECT slug, label, search_query, seo_title, is_active
           FROM categories
           WHERE slug = ?
           LIMIT 1`
        )
        .bind(slug)
        .first<CategoryRow>();
    } catch (error) {
      console.error('Category lookup failed:', error);
    }
  }

  if (record && record.is_active === 0) {
    return { notFound: true };
  }

  const label = record?.label || formatCategoryName(slug);
  const searchQuery = record?.search_query?.trim() || label;
  const provider = getProvider(env);

  const [page, categories, cards] = await Promise.all([
    provider ? provider.search(searchQuery, 1, 20).catch(() => EMPTY_PAGE) : Promise.resolve(EMPTY_PAGE),
    listCategories(env),
    loadCards(db, slug),
  ]);

  return {
    notFound: false,
    slug,
    label,
    searchQuery,
    categories,
    items: mergeCategoryCards(page.items, cards),
    ads: page.ads,
    page: page.page,
    perPage: page.perPage,
    hasNext: page.hasNext,
  };
}
