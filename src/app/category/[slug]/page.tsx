'use client';

import { useParams } from 'next/navigation';
import { CategoryScreen } from '@/components/gif/CategoryScreen';

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  return <CategoryScreen slug={slug} />;
}
