import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const CSP_API_ORIGIN = 'https://jajat.godieboy.com';

const CSP_FILES = [
  'index.html',
  'public/.htaccess',
  'vite.config.ts',
];

describe('frontend CSP configuration', () => {
  it('allows the production API origin in every frontend connect-src policy', () => {
    const policies = CSP_FILES.map((relativePath) => ({
      relativePath,
      content: fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8'),
    }));

    const missing = policies
      .filter(({ content }) => {
        const connectSrc = content.match(/connect-src[^;]+/g) ?? [];
        return !connectSrc.some((directive) => directive.includes(CSP_API_ORIGIN));
      })
      .map(({ relativePath }) => relativePath);

    expect(missing).toEqual([]);
  });
});
