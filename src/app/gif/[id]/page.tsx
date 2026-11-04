'use client';

import { useParams } from 'next/navigation';
import { GifScreen } from '@/components/gif/GifScreen';

export default function GifDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <GifScreen id={id} />;
}
