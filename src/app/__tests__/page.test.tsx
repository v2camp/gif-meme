// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Home from '../page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Home page', () => {
  it('loads trending GIFs in the browser instead of rendering them on the server', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/gifs/trending')) {
        return new Response(
          JSON.stringify({
            items: [{ id: '1', title: 'Cat', url: 'https://example.com/cat.gif', preview_url: 'https://example.com/cat.gif', width: 10, height: 10, source: 'klipy' }],
            ads: [],
            hasNext: false,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify([{ slug: 'reactions', label: 'Reactions' }]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Home />);

    expect(screen.getByTestId('home-loading')).toBeInTheDocument();
    expect(await screen.findByText('Cat')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Reactions')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/gifs/trending?page=1&per_page=20');
    expect(fetchMock).toHaveBeenCalledWith('/api/categories');
  });
});
