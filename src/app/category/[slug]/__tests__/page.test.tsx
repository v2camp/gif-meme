// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CategoryScreen } from '@/components/gif/CategoryScreen';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CategoryScreen', () => {
  it('renders the category payload from one API call', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          label: 'Funny Cats',
          searchQuery: 'Funny Cats',
          categories: [{ slug: 'funny-cats', label: 'Funny Cats' }],
          items: [
            {
              id: 'gif-1',
              title: 'Cat',
              url: 'https://example.com/cat.gif',
              preview_url: 'https://example.com/cat.gif',
              width: 10,
              height: 10,
              source: 'klipy',
            },
          ],
          ads: [],
          hasNext: false,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<CategoryScreen slug="funny-cats" />);

    expect(await screen.findByRole('heading', { name: 'Funny Cats GIFs' })).toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/categories/funny-cats');
  });

  it('shows a missing state for an unknown category', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 })));

    render(<CategoryScreen slug="missing" />);

    expect(await screen.findByTestId('category-missing')).toBeInTheDocument();
  });
});
