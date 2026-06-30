import type { SEOConfig, ResolvedSEOConfig } from './types';
import type { SEODefaults } from './constants';

/**
 * - Appends " | JAJAT" to the title unless `config.suppressSuffix` is `true`
 * - Falls back to `defaults.description` for `description` when omitted
 * - Falls back to `defaults.baseUrl` for `canonicalUrl` when omitted
 * - Falls back to `defaults.ogImage` for `ogImage` when omitted
 * - Falls back to `"website"` for `ogType` when omitted
 * - Falls back to `null` for `structuredData` when omitted
 * - Falls back to `{}` for `alternates` when omitted
 *
 * Does NOT mutate `config` or `defaults`.
 */
export function resolveSEOConfig(
  config: SEOConfig,
  defaults: SEODefaults,
): ResolvedSEOConfig {
  const suffix = config.suppressSuffix ? '' : ' | JAJAT';
  const title = config.title + suffix;

  return {
    title,
    description: config.description ?? defaults.description,
    canonicalUrl: config.canonicalUrl ?? defaults.baseUrl,
    ogImage: config.ogImage ?? defaults.ogImage,
    ogType: config.ogType ?? 'website',
    structuredData: config.structuredData ?? null,
    alternates: config.alternates ?? {},
  };
}
