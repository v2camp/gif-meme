// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/search/SearchInput', () => ({
  SearchInput: ({ placeholder }: { placeholder?: string }) => (
    <input data-testid="search-input" placeholder={placeholder} />
  ),
}));

vi.mock('../ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

import { Header } from '../Header';

afterEach(() => {
  cleanup();
});

describe('Header', () => {
  it('renders the brand link', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('GIF Meme home')).toBeInTheDocument();
  });

  it('renders the mobile menu toggle button', () => {
    render(<Header />);
    expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument();
  });

  it('mobile menu toggle has correct aria-label when closed', () => {
    render(<Header />);
    const toggle = screen.getByTestId('mobile-menu-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens mobile menu when toggle is clicked', () => {
    render(<Header />);
    const toggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-label', 'Close navigation menu');
  });

  it('nav is accessible when mobile menu is open', () => {
    render(<Header />);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('nav contains expected links', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation');
    expect(nav).toContainElement(screen.getByRole('link', { name: /browse/i }));
    expect(nav).toContainElement(screen.getByRole('link', { name: /favorites/i }));
  });

  it('closes mobile menu when toggle is clicked again', () => {
    render(<Header />);
    const toggle = screen.getByTestId('mobile-menu-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
