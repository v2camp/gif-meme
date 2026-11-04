'use client';

import { useEffect, useState } from 'react';
import { GifDetailContent } from '@/app/gif/[id]/GifDetailContent';
import { hasSignedInCookie } from '@/lib/auth/signed-in-cookie';
import { getCarriedGifData } from '@/lib/client/carry-gif-data';
import { useRouteSegment } from '@/lib/client/route-segment';
import type { KlipyGif } from '@/lib/klipy/types';

type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

export function GifScreen({ id: idProp }: { id?: string }) {
  const id = useRouteSegment(idProp, 1);
  const [gif, setGif] = useState<KlipyGif | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialFavorited, setInitialFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;
    const carried = getCarriedGifData();
    if (carried && carried.id === id) {
      setGif(carried);
      setStatus('ready');
    }

    fetch(`/api/gifs/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          if (!carried || carried.id !== id) {
            setStatus('missing');
          }
          return;
        }
        if (!response.ok) {
          throw new Error('GIF request failed');
        }
        const data = (await response.json()) as KlipyGif;
        setGif(data);
        setStatus('ready');
        document.title = `${data.title || 'GIF'} — GifMeme`;
      })
      .catch(() => {
        if (!cancelled && (!carried || carried.id !== id)) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !hasSignedInCookie(document.cookie)) {
      return;
    }

    let cancelled = false;
    setIsAuthenticated(true);
    fetch(`/api/favorites/check?itemType=gif&itemId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { favorited?: boolean; favoriteId?: string | null };
      })
      .then((data) => {
        if (cancelled || !data) {
          return;
        }
        setInitialFavorited(Boolean(data.favorited));
        setFavoriteId(data.favoriteId ?? null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id || status === 'loading') {
    return <p className="gif-detail__loading" data-testid="gif-loading">loading GIF…</p>;
  }

  if (status === 'missing' || !gif) {
    return (
      <div className="gif-detail__error" data-testid="gif-missing">
        <p>GIF not found.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="gif-detail__error">
        <p>Service unavailable. Please try again later.</p>
      </div>
    );
  }

  const embedUrl = `/embed/${id}`;

  return (
    <GifDetailContent
      gif={gif}
      embedUrl={embedUrl}
      initialFavorited={initialFavorited}
      favoriteId={favoriteId}
      isAuthenticated={isAuthenticated}
    />
  );
}
