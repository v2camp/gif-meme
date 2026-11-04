'use client';

import { useEffect, useState } from 'react';
import { SearchClient } from '@/components/search/SearchClient';
import { SearchInput } from '@/components/search/SearchInput';
import type { KlipyAd, KlipyGif, KlipyPage } from '@/lib/klipy/types';

type MediaType = 'gif' | 'sticker';

interface ReadySearch {
  query: string;
  type: MediaType;
  gifs: KlipyGif[];
  ads: KlipyAd[];
  hasNext: boolean;
}

const EMPTY: ReadySearch = {
  query: '',
  type: 'gif',
  gifs: [],
  ads: [],
  hasNext: false,
};

export function SearchScreen() {
  const [ready, setReady] = useState<ReadySearch | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = (params.get('q') ?? '').trim();
    const type: MediaType = params.get('type') === 'sticker' ? 'sticker' : 'gif';

    if (!query) {
      setReady({ ...EMPTY, type });
      return;
    }

    let cancelled = false;
    const endpoint = type === 'gif' ? '/api/gifs/search' : '/api/stickers/search';

    fetch(`${endpoint}?q=${encodeURIComponent(query)}&page=1`)
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          throw new Error('search failed');
        }
        const data = (await response.json()) as KlipyPage<KlipyGif>;
        document.title = `Search results for "${query}" — GifMeme`;
        setReady({
          query,
          type,
          gifs: data.items ?? [],
          ads: data.ads ?? [],
          hasNext: Boolean(data.hasNext),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setReady({ ...EMPTY, query, type });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__heading">
          {ready?.query ? (
            <>search: <span className="search-page__query">{ready.query}</span></>
          ) : (
            'search'
          )}
        </h1>
        <div className="search-page__input-wrap">
          <SearchInput defaultValue={ready?.query ?? ''} placeholder="search GIFs and stickers..." />
        </div>
      </header>

      {ready ? (
        <SearchClient
          key={`${ready.query}:${ready.type}`}
          query={ready.query}
          initialGifs={ready.gifs}
          initialAds={ready.ads}
          initialHasNext={ready.hasNext}
          initialType={ready.type}
        />
      ) : (
        <p className="search-loading" data-testid="search-loading">searching…</p>
      )}
    </div>
  );
}
