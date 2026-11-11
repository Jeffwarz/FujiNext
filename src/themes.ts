// The looks FujiNext can wear. Each id has a matching block in themes.css.

export type Theme = 'dark' | 'light';

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark',  label: 'Dark'  },
  { id: 'light', label: 'Light' },
];

export const DEFAULT_THEME: Theme = 'dark';

/** Anything unknown (an old or hand-edited settings file) falls back to the default. */
export function normalizeTheme(value: unknown): Theme {
  return THEMES.some(t => t.id === value) ? (value as Theme) : DEFAULT_THEME;
}
