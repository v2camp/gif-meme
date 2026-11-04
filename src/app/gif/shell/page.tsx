import { GifScreen } from '@/components/gif/GifScreen';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'GIF — GifMeme',
  description: 'View and share this GIF on GifMeme.',
};

export default function GifShellPage() {
  return <GifScreen />;
}
