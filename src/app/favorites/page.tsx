import type { Metadata } from 'next';
import { FavoritesClient } from './FavoritesClient';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'My Favorites — GifMeme',
  robots: {
    index: false,
  },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
