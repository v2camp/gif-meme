'use client';

import { useParams } from 'next/navigation';
import { EmbedScreen } from '@/components/gif/EmbedScreen';

export default function EmbedGifPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <EmbedScreen id={id} />;
}