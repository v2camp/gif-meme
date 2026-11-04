import { handleScheduled } from './handler';
import { handlePublicApi } from '@/lib/edge/public-api';
import { classifyPublicRoute, isStaticAssetPath, normalizePath } from '@/lib/edge/routes';
import { sealPrivate, serveAsset, type AssetBinding } from '@/lib/edge/shell';

type WorkerEnv = CloudflareEnv & {
  ASSETS?: AssetBinding;
};

async function renderWithNext(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
  const worker = await import('./open-next-worker');
  const response = await worker.default.fetch(request, env, ctx);
  return sealPrivate(response);
}

export const fetch = async (request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> => {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if ((request.method === 'GET' || request.method === 'HEAD') && isStaticAssetPath(path)) {
    const asset = await serveAsset(request, env.ASSETS, path);
    if (asset) {
      return asset;
    }
  }

  const route = classifyPublicRoute(request.method, path);

  if (route.kind === 'api') {
    const response = await handlePublicApi(request, env);
    if (response) {
      return response;
    }
  }

  if (route.kind === 'shell') {
    const shell = await serveAsset(request, env.ASSETS, route.assetPath);
    if (shell) {
      return shell;
    }
  }

  return renderWithNext(request, env, ctx);
};

export const scheduled = (_event: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) => {
  ctx.waitUntil(handleScheduled(env));
};

export default {
  fetch,
  scheduled,
};
