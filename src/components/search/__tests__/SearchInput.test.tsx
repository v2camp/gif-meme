// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const mockNavigate = vi.fn();
vi.mock('@/lib/client/navigate', () => ({
  navigate: (url: string) => mockNavigate(url),
}));

import { SearchInput } from '../SearchInput';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SearchInput', () => {
  it('renders a search input', () => {
    render(<SearchInput />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders with the provided placeholder', () => {
    render(<SearchInput placeholder="Search GIFs..." />);
    expect(screen.getByPlaceholderText('Search GIFs...')).toBeInTheDocument();
  });

  it('uses default placeholder if none provided', () => {
    render(<SearchInput />);
    expect(screen.getByPlaceholderText('search...')).toBeInTheDocument();
  });

  it('shows the current query from defaultValue prop', () => {
    render(<SearchInput defaultValue="cats" />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('cats');
  });

  it('navigates to /search?q=... on form submit', () => {
    render(<SearchInput />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'funny dogs' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=funny%20dogs');
  });

  it('does not navigate when query is empty', () => {
    render(<SearchInput />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('trims whitespace from query before navigating', () => {
    render(<SearchInput />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '  cats  ' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=cats');
  });

  it('has data-testid="search-input-form"', () => {
    render(<SearchInput />);
    expect(screen.getByTestId('search-input-form')).toBeInTheDocument();
  });
});
