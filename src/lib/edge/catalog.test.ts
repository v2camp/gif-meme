import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Like } from './catalog';

const mockTrending = vi.fn();
const mockSearch = vi.fn();
const mockCategories = vi.fn();

vi.mock('@/lib/klipy/provider', () => ({
  KlipyProvider: class MockKlipyProvider {
    trending = mockTrending;
    search = mockSearch;
    categories = mockCategories;
  },
}));

function fakeDb(responder: (sql: string) => unknown): D1Like {
  return {
    prepare(sql: string) {
      const rows = responder(sql);
      const list = Array.isArray(rows) ? rows : [];
      const statement = {
        bind() {
          return statement;
        },
        async all() {
          return { results: list };
        },
        async first() {
          return (Array.isArray(rows) ? rows[0] : rows) ?? null;
        },
      };
      return statement;
    },
  };
}

describe('catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrending.mockResolvedValue({ items: [], ads: [], page: 1, perPage: 20, hasNext: false });
    mockSearch.mockResolvedValue({
      items: [{ id: 'gif-1', title: 'Cat', url: 'https://example.com/cat.gif', preview_url: 'https://example.com/cat.gif', width: 10, height: 10, source: 'klipy' }],
      ads: [],
      page: 1,
      perPage: 20,
      hasNext: false,
    });
    mockCategories.mockResolvedValue({
      data: { data: [{ name: 'Funny Cats' }] },
    });
  });

  it('prefers D1 categories when the database binding is available', async () => {
    const { listCategories } = await import('./catalog');
    const categories = await listCategories({
      KLIPY_API_KEY: 'test_key',
      main_db: fakeDb(() => [
        { slug: 'reactions', label: 'Reactions', seoTitle: null },
        { slug: 'animals', label: 'Animals', seoTitle: null },
      ]),
    });

    expect(categories).toEqual([
      { slug: 'reactions', label: 'Reactions', seoTitle: null },
      { slug: 'animals', label: 'Animals', seoTitle: null },
    ]);
    expect(mockCategories).not.toHaveBeenCalled();
  });

  it('falls back to Klipy categories when D1 is unavailable', async () => {
    const { listCategories } = await import('./catalog');
    const categories = await listCategories({ KLIPY_API_KEY: 'test_key' });

    expect(categories).toEqual([{ slug: 'funny-cats', label: 'Funny Cats' }]);
    expect(mockCategories).toHaveBeenCalledTimes(1);
  });

  it('searches with the saved query and merges pinned cards', async () => {
    const { loadCategory } = await import('./catalog');
    const result = await loadCategory(
      {
        KLIPY_API_KEY: 'test_key',
        'main-db': fakeDb((sql) => {
          if (sql.includes('category_cards')) {
            return [{ id: 'card-1', position: 0, image_url: 'https://example.com/card.gif', image_name: 'Pinned', link_url: null }];
          }
          if (sql.includes('WHERE slug')) {
            return [{ slug: 'funny-cats', label: 'Funny Cats', search_query: 'lol cats', seo_title: null, is_active: 1 }];
          }
          return [{ slug: 'funny-cats', label: 'Funny Cats', seoTitle: null }];
        }),
      },
      'funny-cats'
    );

    expect(mockSearch).toHaveBeenCalledWith('lol cats', 1, 20);
    expect(result.notFound).toBe(false);
    if (!result.notFound) {
      expect(result.items[0]?.id).toBe('card-card-1');
      expect(result.items[1]?.id).toBe('gif-1');
      expect(result.searchQuery).toBe('lol cats');
    }
  });

  it('formats a missing category slug into the search query', async () => {
    const { loadCategory } = await import('./catalog');
    await loadCategory({ KLIPY_API_KEY: 'test_key' }, 'trending-memes-2025');
    expect(mockSearch).toHaveBeenCalledWith('Trending Memes 2025', 1, 20);
  });

  it('hides inactive categories', async () => {
    const { loadCategory } = await import('./catalog');
    const result = await loadCategory(
      {
        KLIPY_API_KEY: 'test_key',
        main_db: fakeDb((sql) => {
          if (sql.includes('WHERE slug')) {
            return [{ slug: 'old', label: 'Old', search_query: null, seo_title: null, is_active: 0 }];
          }
          return [];
        }),
      },
      'old'
    );

    expect(result).toEqual({ notFound: true });
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
