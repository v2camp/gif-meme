// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const mockNavigate = vi.fn();
vi.mock('@/lib/client/navigate', () => ({
  navigate: (url: string) => mockNavigate(url),
}));

import { FavoritesClient } from '../FavoritesClient';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('FavoritesClient', () => {
  it('sends unauthenticated users to login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })));

    render(<FavoritesClient />);

    expect(await screen.findByTestId('favorites-loading')).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/api/auth/login');
    });
  });

  it('renders saved GIFs for an authenticated response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'fav-1',
                itemId: 'gif-xyz',
                itemTitle: 'Cool GIF',
                itemUrl: 'https://example.com/cool.gif',
                itemPreviewUrl: 'https://example.com/cool_thumb.gif',
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    render(<FavoritesClient />);

    expect(await screen.findByText('Cool GIF')).toBeInTheDocument();
  });

  it('renders the empty state when the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })));

    render(<FavoritesClient />);

    expect(await screen.findByTestId('favorites-empty')).toBeInTheDocument();
  });

  it('renders the empty state when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('Network error'))));

    render(<FavoritesClient />);

    expect(await screen.findByTestId('favorites-empty')).toBeInTheDocument();
  });
});
