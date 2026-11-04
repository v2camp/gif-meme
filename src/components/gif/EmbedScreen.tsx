'use client';

import { useEffect, useState } from 'react';
import { useRouteSegment } from '@/lib/client/route-segment';
import type { KlipyGif } from '@/lib/klipy/types';

export function EmbedScreen({ id: idProp }: { id?: string }) {
  const id = useRouteSegment(idProp, 1);
  const [gif, setGif] = useState<KlipyGif | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;
    fetch(`/api/gifs/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setGif(null);
          return;
        }
        setGif((await response.json()) as KlipyGif);
      })
      .catch(() => {
        if (!cancelled) {
          setGif(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSettled(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <section className="embed-page" aria-label="Embedded GIF">
      <div className="embed-page__frame">
        {gif ? (
          <div className="embed-page__media">
            <img
              src={gif.url}
              alt={gif.title || 'GIF'}
              className="embed-page__img"
              width={gif.width}
              height={gif.height}
            />
          </div>
        ) : (
          <div className="embed-page__empty">{settled ? 'GIF unavailable.' : 'Loading GIF…'}</div>
        )}

        {id ? (
          <a
            href={`/gif/${id}`}
            className="embed-page__link"
            target="_top"
            rel="noopener noreferrer"
          >
            Powered by GifMeme
          </a>
        ) : null}
      </div>
    </section>
  );
}
