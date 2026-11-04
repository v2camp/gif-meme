'use client';

import { carryGifData } from '@/lib/client/carry-gif-data';
import type { KlipyGif } from '@/lib/klipy/types';

interface GifCardProps {
  gif: KlipyGif;
  className?: string;
}

export function GifCard({ gif, className = '' }: GifCardProps) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    carryGifData(gif);
  }

  return (
    <a
      href={`/gif/${gif.id}`}
      className={`gif-card ${className}`}
      data-testid="gif-card"
      onClick={handleClick}
    >
      <div className="gif-card__media">
        <img
          src={gif.preview_url}
          alt={gif.title}
          className="gif-card__img"
          loading="lazy"
          width={gif.width}
          height={gif.height}
        />
        <div className="gif-card__overlay">
          <span className="gif-card__title">{gif.title}</span>
        </div>
      </div>
    </a>
  );
}
