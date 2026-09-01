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
  it('uses explicit script and style fallbacks without inline JavaScript in production', () => {
    const productionPolicies = ['index.html', 'public/.htaccess'].map((relativePath) => ({
      relativePath,
      content: fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8'),
    }));

    for (const { relativePath, content } of productionPolicies) {
      expect(content).toContain("script-src-elem 'self'");
      expect(content).toContain("script-src-attr 'none'");
      expect(content).toContain("style-src-elem 'self'");
      expect(content).toContain("style-src-attr 'none'");
      const csp = relativePath === 'public/.htaccess'
        ? content
        : content.match(/<meta http-equiv="Content-Security-Policy"[^>]+/)?.[0] ?? content;
      if (relativePath === 'index.html') {
        expect(csp).toContain("script-src 'self' 'unsafe-inline'");
        continue;
      }
      const scriptSource = csp.match(/(?:^|[;])\s*script-src\s+[^;]*/)?.[0] ?? '';
      const scriptElementSource = csp.match(/(?:^|[;])\s*script-src-elem\s+[^;]*/)?.[0] ?? '';
      expect(scriptSource).toContain("script-src 'self'");
      expect(scriptElementSource).toContain("script-src-elem 'self'");
      expect(scriptSource).not.toContain("'unsafe-inline'");
      expect(scriptElementSource).not.toContain("'unsafe-inline'");
    }
  });

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
