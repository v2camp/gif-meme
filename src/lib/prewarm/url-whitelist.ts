const MAX_CATEGORY_URLS = 50;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

export function getPrewarmUrls(baseUrl: string, categories: string[]): string[] {
  const root = normalizeBaseUrl(baseUrl);
  const urls: string[] = [
    `${root}/api/categories`,
    `${root}/api/gifs/trending?page=1`,
    `${root}/api/gifs/trending?page=2`,
    `${root}/api/gifs/trending?page=3`,
    `${root}/api/stickers/trending?page=1`,
    `${root}/api/stickers/trending?page=2`,
  ];

  const categoryUrls = categories
    .slice(0, MAX_CATEGORY_URLS)
    .map((slug) => `${root}/api/categories/${encodeURIComponent(slug)}`);

  return [...urls, ...categoryUrls];
}
