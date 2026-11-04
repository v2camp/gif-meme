// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { PRESERVE_URL_SCRIPT } from './preserve-url';

describe('preserve url script', () => {
  afterEach(() => {
    window.__gifmemeReady = false;
  });

  it('keeps the requested URL until the shell has hydrated', () => {
    window.history.replaceState(null, '', '/gif/abc?q=1');
    window.eval(PRESERVE_URL_SCRIPT);

    window.history.replaceState({ __NA: true }, '', '/gif/shell');

    expect(window.location.pathname).toBe('/gif/abc');
    expect(window.location.search).toBe('?q=1');

    window.__gifmemeReady = true;
    window.history.pushState({}, '', '/favorites');

    expect(window.location.pathname).toBe('/favorites');
  });
});