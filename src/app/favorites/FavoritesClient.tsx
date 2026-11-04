'use client';

import { useEffect, useState } from 'react';
import { GifGrid } from '@/components/gif/GifGrid';
import { navigate } from '@/lib/client/navigate';
import type { KlipyGif } from '@/lib/klipy/types';

const FAVORITES_LIMIT = 500;

interface FavoriteItem {
  id: string;
  itemId: string;
  itemTitle: string | null;
  itemUrl: string | null;
  itemPreviewUrl: string | null;
}

function favoriteToGif(item: FavoriteItem): KlipyGif {
  return {
    id: item.itemId,
    title: item.itemTitle ?? item.itemId,
    url: item.itemUrl ?? '',
    preview_url: item.itemPreviewUrl ?? item.itemUrl ?? '',
    width: 320,
    height: 240,
    source: '',
  };
}

export function FavoritesClient() {
  const [gifs, setGifs] = useState<KlipyGif[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/favorites?page=1&per_page=50')
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 401) {
          navigate('/api/auth/login');
          return;
        }
        if (!response.ok) {
          setGifs([]);
          return;
        }
        const data = (await response.json()) as { items?: FavoriteItem[] };
        setGifs((data.items ?? []).map(favoriteToGif));
      })
      .catch(() => {
        if (!cancelled) {
          setGifs([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const count = gifs?.length ?? 0;

  return (
    <div className="favorites-page">
      <header className="favorites-page__header">
        <h1 className="favorites-page__title">favorites</h1>
        <span className="favorites-page__count" aria-label={`${count} of ${FAVORITES_LIMIT} favorites used`}>
          {count} / {FAVORITES_LIMIT}
        </span>
      </header>

      {gifs === null ? (
        <p className="favorites-loading" data-testid="favorites-loading">loading favorites…</p>
      ) : gifs.length === 0 ? (
        <div className="favorites-empty" data-testid="favorites-empty">
          <p className="favorites-empty__text">you haven&rsquo;t saved any favorites yet</p>
          <p className="favorites-empty__subtext">start exploring and click the heart icon to save your favorite GIFs and stickers</p>
        </div>
      ) : (
        <GifGrid gifs={gifs} ads={[]} />
      )}
    </div>
  );
}
