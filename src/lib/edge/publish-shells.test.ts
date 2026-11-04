import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { publishStaticShells } from '../../../scripts/publish-static-shells.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('publishStaticShells', () => {
  it('writes prerendered HTML into the asset paths Workers serve without the Worker', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gifmeme-shells-'));
    tempDirs.push(root);
    const cacheDir = path.join(root, 'cache', 'build123');
    const assetsDir = path.join(root, 'assets');
    fs.mkdirSync(path.join(cacheDir, 'gif'), { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'index.cache'),
      JSON.stringify({ type: 'app', html: '<html>home-loading</html>' })
    );
    fs.writeFileSync(
      path.join(cacheDir, 'gif', 'shell.cache'),
      JSON.stringify({ type: 'app', html: '<html>gif-loading</html>' })
    );
    fs.writeFileSync(
      path.join(cacheDir, 'robots.txt.cache'),
      JSON.stringify({ type: 'app', html: 'user-agent: *' })
    );

    const published = publishStaticShells(path.join(root, 'cache'), assetsDir);

    expect(published.sort()).toEqual(['gif/shell.html', 'index.html']);
    expect(fs.readFileSync(path.join(assetsDir, 'index.html'), 'utf8')).toContain('home-loading');
    expect(fs.readFileSync(path.join(assetsDir, 'gif/shell.html'), 'utf8')).toContain('gif-loading');
    expect(fs.existsSync(path.join(assetsDir, 'robots.txt.html'))).toBe(false);
  });
});