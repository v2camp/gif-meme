'use client';

import { useEffect, useState } from 'react';
import { CategoryBar, type CategoryItem } from '@/components/gif/CategoryBar';
import { CategoryClient } from '@/components/gif/CategoryClient';
import { useRouteSegment } from '@/lib/client/route-segment';
import type { KlipyAd, KlipyGif } from '@/lib/klipy/types';

interface CategoryPayload {
  label: string;
  searchQuery: string;
  categories: CategoryItem[];
  items: KlipyGif[];
  ads: KlipyAd[];
  hasNext: boolean;
}

export function CategoryScreen({ slug: slugProp }: { slug?: string }) {
  const slug = useRouteSegment(slugProp, 1);
  const [payload, setPayload] = useState<CategoryPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!slug) {
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetch(`/api/categories/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          setStatus('missing');
          return;
        }
        if (!response.ok) {
          throw new Error('Category request failed');
        }
        const data = (await response.json()) as CategoryPayload;
        setPayload(data);
        setStatus('ready');
        document.title = `${data.label} GIFs — GifMeme`;
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug || status === 'loading') {
    return <p className="category-loading" data-testid="category-loading">loading category…</p>;
  }

  if (status === 'missing') {
    return <p className="category-empty" data-testid="category-missing">category not found</p>;
  }

  if (status === 'error' || !payload) {
    return <p className="category-error" data-testid="category-error">failed to load this category</p>;
  }

  return (
    <div className="category-page">
      <header className="category-page__header">
        <h1 className="category-page__title">{payload.label} GIFs</h1>
      </header>
      <CategoryBar categories={payload.categories} selected={slug} />
      <CategoryClient
        categoryName={payload.searchQuery}
        initialGifs={payload.items}
        initialAds={payload.ads}
        initialHasNext={payload.hasNext}
      />
    </div>
  );
}
