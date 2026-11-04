'use client';

import { useState } from 'react';
import { navigate } from '@/lib/client/navigate';

interface SearchInputProps {
  defaultValue?: string;
  placeholder?: string;
}

export function SearchInput({ defaultValue = '', placeholder = 'search...' }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="search-input-form"
      data-testid="search-input-form"
    >
      <input
        type="search"
        role="searchbox"
        className="search-input-form__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search GIFs and stickers"
      />
      <button type="submit" className="search-input-form__btn" aria-label="Submit search">
        ⌕
      </button>
    </form>
  );
}
