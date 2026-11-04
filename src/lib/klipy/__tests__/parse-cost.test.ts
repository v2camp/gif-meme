import { describe, expect, it } from 'vitest';
import { parseKlipyData } from '../ad-parser';

function makeItem(id: number) {
  const file: Record<string, Record<string, { url: string; width: number; height: number; size: number }>> = {};
  for (const size of ['hd', 'md', 'sm', 'xs']) {
    file[size] = {
      gif: { url: `https://cdn.example.com/${size}/${id}.gif?token=${'a'.repeat(80)}`, width: 480, height: 360, size: 200000 },
      webp: { url: `https://cdn.example.com/${size}/${id}.webp?token=${'b'.repeat(80)}`, width: 480, height: 360, size: 80000 },
      mp4: { url: `https://cdn.example.com/${size}/${id}.mp4?token=${'c'.repeat(80)}`, width: 480, height: 360, size: 400000 },
    };
  }

  return {
    id,
    title: `GIF title ${id} ${'meme '.repeat(12)}`,
    slug: `gif-${id}`,
    type: 'gif',
    file,
    blur_preview: `data:image/jpeg;base64,${'x'.repeat(400)}`,
    tags: Array.from({ length: 8 }, (_, index) => `tag-${id}-${index}`),
  };
}

describe('public API payload cost', () => {
  it('maps a page of GIF metadata well under the 10ms free-plan budget', () => {
    const payload = { data: { data: Array.from({ length: 24 }, (_, index) => makeItem(index + 1)) } };
    const json = JSON.stringify(payload);
    const runs = 20;
    const started = performance.now();
    for (let i = 0; i < runs; i += 1) {
      const parsed = JSON.parse(json) as { data: { data: unknown[] } };
      const { items } = parseKlipyData(parsed.data.data);
      expect(items).toHaveLength(24);
    }
    const eachMs = (performance.now() - started) / runs;
    console.log(JSON.stringify({ items: 24, bytes: json.length, parseAndMapMs: Number(eachMs.toFixed(3)) }));
    expect(eachMs).toBeLessThan(8);
  });
});
