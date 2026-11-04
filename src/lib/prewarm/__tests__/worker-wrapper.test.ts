import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../open-next-worker', () => ({
  default: {
    fetch: vi.fn(),
  },
}));

vi.mock('../handler', () => ({
  handleScheduled: vi.fn(),
}));

import openNextWorker from '../open-next-worker';
import { handleScheduled } from '../handler';
import worker, { fetch, scheduled } from '../worker-wrapper';

const gifPayload = {
  data: {
    id: '42',
    title: 'Cached Cat',
    slug: 'cached-cat',
    type: 'gif',
    file: {
      hd: { gif: { url: 'https://example.com/cat.gif', width: 200, height: 200, size: 1000 } },
      sm: { gif: { url: 'https://example.com/cat-sm.gif', width: 100, height: 100, size: 500 } },
    },
  },
};

describe('prewarm worker wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('answers public GIF reads without starting OpenNext', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.includes('api.klipy.com')) {
        throw new Error(`unexpected fetch ${url}`);
      }
      return new Response(JSON.stringify(gifPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', undefined);

    const response = await fetch(
      new Request('https://gifmeme.org/api/gifs/42'),
      { KLIPY_API_KEY: 'test-api-key' } as CloudflareEnv,
      { waitUntil: vi.fn() } as unknown as ExecutionContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: '42',
      title: 'Cached Cat',
      url: 'https://example.com/cat.gif',
    });
    expect(response.headers.get('cache-control')).toContain('public');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(openNextWorker.fetch).not.toHaveBeenCalled();
  });

  it('serves a dynamic document from the static shell', async () => {
    const assets = {
      fetch: vi.fn(async () => new Response('<html>shell</html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    };

    const response = await fetch(
      new Request('https://gifmeme.org/gif/42'),
      { ASSETS: assets } as unknown as CloudflareEnv,
      { waitUntil: vi.fn() } as unknown as ExecutionContext
    );

    expect(assets.fetch).toHaveBeenCalledTimes(1);
    const assetRequest = assets.fetch.mock.calls[0][0] as Request;
    expect(new URL(assetRequest.url).pathname).toBe('/gif/shell');
    expect(await response.text()).toBe('<html>shell</html>');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(openNextWorker.fetch).not.toHaveBeenCalled();
  });

  it('marks OpenNext responses private so account data is not cached', async () => {
    const response = new Response(JSON.stringify({ user: { email: 'a@b.c' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(openNextWorker.fetch).mockResolvedValueOnce(response);

    const result = await fetch(
      new Request('https://gifmeme.org/api/auth/me'),
      {} as CloudflareEnv,
      { waitUntil: vi.fn() } as unknown as ExecutionContext
    );

    expect(openNextWorker.fetch).toHaveBeenCalledTimes(1);
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    await expect(result.json()).resolves.toEqual({ user: { email: 'a@b.c' } });
  });

  it('scheduled handler uses ctx.waitUntil(handleScheduled(env))', () => {
    const env = {} as CloudflareEnv;
    const pending = Promise.resolve({
      total: 0,
      succeeded: 0,
      failed: 0,
      failedUrls: [],
      durationMs: 0,
    });
    vi.mocked(handleScheduled).mockReturnValueOnce(pending);

    const waitUntil = vi.fn();
    scheduled({} as ScheduledController, env, { waitUntil } as unknown as ExecutionContext);

    expect(handleScheduled).toHaveBeenCalledWith(env);
    expect(waitUntil).toHaveBeenCalledWith(pending);
    expect(worker.scheduled).toBe(scheduled);
    expect(worker.fetch).toBe(fetch);
  });
});
