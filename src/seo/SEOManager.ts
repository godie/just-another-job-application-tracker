import i18n from 'i18next';
import type { ResolvedSEOConfig } from './types';

/**
 * Returns the current locale string, falling back to the document's lang
 * attribute and then to 'en' if neither is available.
 */
function currentLocale(): string {
  return i18n.language || document.documentElement.lang || 'en';
}

/**
 * SEOManager — pure DOM-manipulation class for managing `<head>` SEO tags.
 *
 * All methods are idempotent: calling them multiple times with the same
 * arguments leaves exactly one matching element in `document.head`.
 */
export class SEOManager {
  /**
   * Upserts a `<meta>` element in `document.head`.
   *
   * - Queries for an existing element with `[attr="nameOrProperty"]`
   * - Updates `content` in-place if found; appends a new element if not found
   * - Defaults `attr` to `"name"` when omitted
   *
   * @param nameOrProperty - The value for the `name` or `property` attribute
   * @param content        - The value for the `content` attribute
   * @param attr           - Which attribute to match on: `"name"` (default) or `"property"`
   */
  static upsertMeta(
    nameOrProperty: string,
    content: string,
    attr: 'name' | 'property' = 'name',
  ): void {
    const selector = `meta[${attr}="${nameOrProperty}"]`;
    const existing = document.head.querySelector<HTMLMetaElement>(selector);

    if (existing !== null) {
      existing.setAttribute('content', content);
    } else {
      const el = document.createElement('meta');
      el.setAttribute(attr, nameOrProperty);
      el.setAttribute('content', content);
      document.head.appendChild(el);
    }
  }

  /**
   * Upserts a `<link rel="canonical">` element in `document.head`.
   *
   * - Updates `href` in-place if a canonical link already exists
   * - Appends a new element if none is found
   *
   * @param url - The canonical URL for the current page
   */
  static upsertCanonical(url: string): void {
    const selector = 'link[rel="canonical"]';
    const existing = document.head.querySelector<HTMLLinkElement>(selector);

    if (existing !== null) {
      existing.setAttribute('href', url);
    } else {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      el.setAttribute('href', url);
      document.head.appendChild(el);
    }
  }

  /**
   * Upserts or removes a `<script type="application/ld+json" data-seo="true">`
   * element in `document.head`.
   *
   * - When `data` is non-null: upserts the script with `JSON.stringify(data, null, 2)`
   * - When `data` is `null`: removes any existing such script (no-op if absent)
   *
   * @param data - JSON-LD structured data object, or `null` to remove
   */
  static upsertJsonLd(data: Record<string, unknown> | null): void {
    const selector = 'script[type="application/ld+json"][data-seo="true"]';
    const existing = document.head.querySelector<HTMLScriptElement>(selector);

    if (data === null) {
      if (existing !== null) {
        existing.remove();
      }
      return;
    }

    if (existing !== null) {
      existing.textContent = JSON.stringify(data, null, 2);
    } else {
      const el = document.createElement('script');
      el.setAttribute('type', 'application/ld+json');
      el.setAttribute('data-seo', 'true');
      el.textContent = JSON.stringify(data, null, 2);
      document.head.appendChild(el);
    }
  }

  /**
   * Replaces all `<link rel="alternate" data-seo="true">` elements in
   * `document.head` with one element per entry in `alternates`.
   *
   * - Removes all existing such elements first (full replace, not merge)
   * - Appends one `<link rel="alternate" hreflang="{locale}" href="{url}" data-seo="true">`
   *   per `[locale, url]` entry
   *
   * @param alternates - Map of locale → absolute URL
   */
  static upsertHreflang(alternates: Record<string, string>): void {
    // Remove all existing hreflang alternate links managed by SEOManager
    const existing = document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][data-seo="true"]',
    );
    existing.forEach((el) => el.remove());

    // Append one element per entry
    for (const [locale, url] of Object.entries(alternates)) {
      const el = document.createElement('link');
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', locale);
      el.setAttribute('href', url);
      el.setAttribute('data-seo', 'true');
      document.head.appendChild(el);
    }
  }

  /**
   * Applies a fully-resolved SEO configuration to `document.head`.
   *
   * Sets the page title and upserts all standard meta tags, Open Graph tags,
   * Twitter Card tags, canonical URL, hreflang alternates, and JSON-LD
   * structured data according to the design's algorithm.
   *
   * @param resolved - The fully-resolved SEO configuration
   */
  static apply(resolved: ResolvedSEOConfig): void {
    // 1. Page title
    document.title = resolved.title;

    // 2. Standard meta tags
    SEOManager.upsertMeta('description', resolved.description, 'name');
    SEOManager.upsertMeta('robots', 'index, follow', 'name');

    // 3. Open Graph tags
    SEOManager.upsertMeta('og:type', resolved.ogType, 'property');
    SEOManager.upsertMeta('og:title', resolved.title, 'property');
    SEOManager.upsertMeta('og:description', resolved.description, 'property');
    SEOManager.upsertMeta('og:url', resolved.canonicalUrl, 'property');
    SEOManager.upsertMeta('og:image', resolved.ogImage, 'property');
    SEOManager.upsertMeta('og:site_name', 'JAJAT', 'property');
    SEOManager.upsertMeta('og:locale', currentLocale(), 'property');

    // 4. Twitter Card tags
    SEOManager.upsertMeta('twitter:card', 'summary_large_image', 'name');
    SEOManager.upsertMeta('twitter:title', resolved.title, 'name');
    SEOManager.upsertMeta('twitter:description', resolved.description, 'name');
    SEOManager.upsertMeta('twitter:image', resolved.ogImage, 'name');

    // 5. Canonical URL
    SEOManager.upsertCanonical(resolved.canonicalUrl);

    // 6. hreflang alternates
    SEOManager.upsertHreflang(resolved.alternates);

    // 7. JSON-LD structured data
    SEOManager.upsertJsonLd(resolved.structuredData);
  }
}
