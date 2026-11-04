import { EmbedScreen } from '@/components/gif/EmbedScreen';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Embed GIF — GifMeme',
  robots: {
    index: false,
  },
};

export default function EmbedShellPage() {
  return <EmbedScreen />;
}
