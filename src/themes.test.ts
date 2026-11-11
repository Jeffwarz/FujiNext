import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const themesCss = readFileSync(new URL('./themes.css', import.meta.url), 'utf8');
import { THEMES, normalizeTheme, DEFAULT_THEME } from './themes';

describe('themes', () => {
  it('keeps known looks and replaces anything else with the default', () => {
    for (const t of THEMES) expect(normalizeTheme(t.id)).toBe(t.id);
    for (const bad of ['', 'neon', undefined, null, 3, 'DARK']) expect(normalizeTheme(bad)).toBe(DEFAULT_THEME);
  });

  it('has a block in themes.css for every look, and the default is the base', () => {
    const css = themesCss;
    for (const t of THEMES) expect(css).toContain(`:root[data-theme="${t.id}"]`);
    expect(DEFAULT_THEME).toBe('dark');
  });

  it('gives every look the same set of variables', () => {
    const css = themesCss;
    const block = (id: string) => css.split(`:root[data-theme="${id}"] {`)[1].split('}')[0];
    const names = (b: string) => [...b.matchAll(/(--[\w-]+):/g)].map(m => m[1]);
    // The light block only overrides colours; it must not invent variables the base lacks.
    const base = new Set(names(css.split('}')[0]));
    for (const n of names(block('light'))) expect(base.has(n)).toBe(true);
  });
});
