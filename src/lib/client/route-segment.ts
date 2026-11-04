'use client';

import { useEffect, useState } from 'react';

export function useRouteSegment(explicit: string | undefined, index: number): string {
  const [segment, setSegment] = useState(explicit ?? '');

  useEffect(() => {
    if (explicit) {
      setSegment(explicit);
      return;
    }

    const parts = window.location.pathname.split('/').filter(Boolean);
    setSegment(decodeURIComponent(parts[index] ?? ''));
  }, [explicit, index]);

  return explicit || segment;
}
