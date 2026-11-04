import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HTML_ROUTES = new Set([
  'index.html',
  'search.html',
  'login.html',
  'favorites.html',
  'gif/shell.html',
  'category/shell.html',
  'embed/shell.html',
]);

export function publishStaticShells(cacheDir, assetsDir) {
  const buildIds = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (buildIds.length === 0) {
    throw new Error(`No OpenNext cache build found in ${cacheDir}`);
  }

  const published = [];

  for (const buildId of buildIds) {
    const root = path.join(cacheDir, buildId);
    const files = walk(root).filter((file) => file.endsWith('.cache'));

    for (const file of files) {
      const relativeCache = path.relative(root, file).replace(/\\/g, '/');
      const assetRelative = relativeCache.replace(/\.cache$/, '.html');
      if (!HTML_ROUTES.has(assetRelative)) {
        continue;
      }

      const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof payload.html !== 'string' || payload.html.length === 0) {
        throw new Error(`Prerendered shell ${relativeCache} has no HTML`);
      }

      const destination = path.join(assetsDir, assetRelative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, payload.html);
      published.push(assetRelative);
    }
  }

  return published;
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const root = process.cwd();
  const published = publishStaticShells(
    path.join(root, '.open-next/cache'),
    path.join(root, '.open-next/assets')
  );
  console.log(`Published ${published.length} static shells:`);
  for (const file of published) {
    console.log(`  ${file}`);
  }
}
