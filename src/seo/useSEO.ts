import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { SEO_DEFAULTS } from './constants';
import { SEOManager } from './SEOManager';
import { resolveSEOConfig } from './resolve';
import type { SEOConfig, SEOResult } from './types';

/**
 * React hook that applies SEO metadata to `document.head` on mount and
 * whenever the config or active i18n language changes.
 *
 * - Calls `resolveSEOConfig(config, SEO_DEFAULTS)` to produce a fully-resolved config
 * - Calls `SEOManager.apply(resolved)` inside a `useEffect` so it runs after render
 * - No cleanup on unmount — meta tags persist intentionally (SPA behaviour)
 *
 * @param config - Per-page SEO configuration
 * @returns `{ resolved }` — the fully-resolved config, useful for testing
 */
export function useSEO(config: SEOConfig): SEOResult {
  const { i18n } = useTranslation();

  const resolved = resolveSEOConfig(config, SEO_DEFAULTS);

  useEffect(() => {
    SEOManager.apply(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolved.title,
    resolved.description,
    resolved.canonicalUrl,
    resolved.ogImage,
    resolved.ogType,
    resolved.structuredData,
    resolved.alternates,
    i18n.language,
  ]);

  return { resolved };
}
