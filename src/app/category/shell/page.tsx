import { CategoryScreen } from '@/components/gif/CategoryScreen';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'GIFs — GifMeme',
  description: 'Explore GIFs and memes on GifMeme.',
};

export default function CategoryShellPage() {
  return <CategoryScreen />;
}
