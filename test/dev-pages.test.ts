import { readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { GROUPS, PAGES, UNLISTED } from '../dev/pages';

// the dev shell lists pages from a manifest; a page added without an entry
// would be unreachable from it, as three were from the old index
const served = (dir: string) =>
  readdirSync(resolve(import.meta.dirname, '..', dir))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `/${dir}/${f}`);

describe('dev shell manifest', () => {
  test('lists every example and playground page', () => {
    const files = [...served('examples'), ...served('playground')].filter(
      (p) => !(p in UNLISTED)
    );
    const listed = PAGES.map((p) => p.path);
    expect(files.filter((f) => !listed.includes(f))).toEqual([]);
    expect(listed.filter((p) => !files.includes(p))).toEqual([]);
    // an unlisted page shows under its parent, which must be listed
    for (const parent of Object.values(UNLISTED)) {
      expect(listed).toContain(parent);
    }
  });

  test('lists each page once, with a title and description', () => {
    const paths = PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const page of PAGES) {
      expect(page.title, page.path).not.toBe('');
      expect(page.description, page.path).not.toBe('');
    }
    expect(new Set(GROUPS.map((g) => g.id)).size).toBe(GROUPS.length);
  });
});
