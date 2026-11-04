import { HomeClient } from '@/components/gif/HomeClient';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'GifMeme — Browse Trending GIFs & Stickers',
  description: 'Discover and share the best trending GIFs and stickers on GifMeme.',
};

export default function Home() {
  return (
    <div className="home-page">
      <header className="home-page__hero">
        <h1 className="home-page__heading">gif.meme</h1>
        <p className="home-page__sub">trending GIFs &amp; memes</p>
      </header>
      <HomeClient
        fetchOnMount
        initialGifs={[]}
        initialAds={[]}
        initialHasNext={false}
        categories={[]}
      />
    </div>
  );
}
