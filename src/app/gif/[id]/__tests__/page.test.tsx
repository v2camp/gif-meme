// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GifScreen } from '@/components/gif/GifScreen';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GifScreen', () => {
  it('loads a GIF once from the public API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/favorites')) {
        return new Response(JSON.stringify({ favorited: false, favoriteId: null }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: 'test-123',
          title: 'Test GIF',
          url: 'https://example.com/test.gif',
          preview_url: 'https://example.com/test.gif',
          width: 400,
          height: 300,
          source: 'klipy',
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<GifScreen id="test-123" />);

    expect(await screen.findByRole('img', { name: 'Test GIF' })).toBeInTheDocument();
    const gifCalls = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/gifs/test-123');
    expect(gifCalls).toHaveLength(1);
  });

  it('shows a not-found state when the API returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'GIF not found' }), { status: 404 })));

    render(<GifScreen id="missing" />);

    expect(await screen.findByTestId('gif-missing')).toBeInTheDocument();
  });
});
