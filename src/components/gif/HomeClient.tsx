'use client';

import { useEffect, useState } from 'react';
import { GifGrid } from '@/components/gif/GifGrid';
import { CategoryBar } from '@/components/gif/CategoryBar';
import { LoadMore } from '@/components/gif/LoadMore';
import type { KlipyGif, KlipyAd, KlipyPage } from '@/lib/klipy/types';
import type { CategoryItem } from '@/components/gif/CategoryBar';

interface HomeClientProps {
  initialGifs: KlipyGif[];
  initialAds: KlipyAd[];
  initialHasNext: boolean;
  categories: CategoryItem[];
  fetchOnMount?: boolean;
}

export function HomeClient({ initialGifs, initialAds, initialHasNext, categories: initialCategories, fetchOnMount = false }: HomeClientProps) {
  const [gifs, setGifs] = useState<KlipyGif[]>(initialGifs);
  const [ads, setAds] = useState<KlipyAd[]>(initialAds);
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fetchOnMount) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [trendingResponse, categoryResponse] = await Promise.all([
          fetch('/api/gifs/trending?page=1&per_page=20'),
          fetch('/api/categories'),
        ]);
        if (cancelled) {
          return;
        }
        if (!trendingResponse.ok) {
          setError('Failed to load trending GIFs.');
        } else {
          const data: KlipyPage<KlipyGif> = await trendingResponse.json();
          setGifs(data.items ?? []);
          setAds(data.ads ?? []);
          setHasNext(Boolean(data.hasNext));
        }
        if (categoryResponse.ok) {
          const nextCategories = await categoryResponse.json();
          if (Array.isArray(nextCategories)) {
            setCategories(nextCategories);
          }
        }
      } catch {
        if (!cancelled) {
          setError('An error occurred while loading GIFs.');
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchOnMount]);

  const handleLoadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    const nextPage = page + 1;
    try {
      const url = `/api/gifs/trending?page=${nextPage}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: KlipyPage<KlipyGif> = await res.json();
        setGifs((prev) => [...prev, ...data.items]);
        setAds(data.ads);
        setHasNext(data.hasNext);
        setPage(nextPage);
      } else {
        setError('Failed to load more trending GIFs.');
      }
    } catch (err) {
      setError('An error occurred while loading more GIFs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home">
      <CategoryBar
        categories={categories}
        selected={null}
      />
      {error && (
        <div className="home-error" data-testid="home-error">
          <p className="home-error__text">{error}</p>
        </div>
      )}
      {initialLoading ? (
        <p className="home-loading" data-testid="home-loading">loading trending GIFs…</p>
      ) : (
        <GifGrid gifs={gifs} ads={ads} />
      )}
      {!initialLoading && (
        <LoadMore onLoadMore={handleLoadMore} hasMore={hasNext} isLoading={isLoading} />
      )}
    </div>
  );
}
