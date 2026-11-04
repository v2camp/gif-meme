import { SearchScreen } from '@/components/search/SearchScreen';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Search — GifMeme',
  description: 'Search for your favorite GIFs and stickers on GifMeme.',
};

export default function SearchPage() {
  return <SearchScreen />;
}
