export interface AssetBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export async function serveAsset(
  request: Request,
  assets: AssetBinding | undefined,
  assetPath: string
): Promise<Response | null> {
  if (!assets) {
    return null;
  }

  const url = new URL(request.url);
  url.pathname = assetPath;
  url.search = '';

  let asset: Response;
  try {
    asset = await assets.fetch(new Request(url.toString(), { method: 'GET' }));
  } catch (error) {
    console.error('Asset fetch failed:', assetPath, error);
    return null;
  }

  if (!asset.ok) {
    return null;
  }

  const headers = new Headers(asset.headers);
  headers.delete('set-cookie');
  headers.set('x-gifmeme-edge', 'shell');
  if (!headers.has('content-type')) {
    headers.set('content-type', assetPath === '/' || !assetPath.includes('.') ? 'text/html; charset=utf-8' : 'application/octet-stream');
  }
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=300');
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: asset.status, headers });
  }

  return new Response(asset.body, { status: asset.status, headers });
}

export function sealPrivate(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
