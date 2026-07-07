import i18n from 'i18next';
import type { ResolvedSEOConfig } from './types';

function currentLocale(): string {
  return i18n.language || document.documentElement.lang || 'en';
}

/**
 * All methods are idempotent: calling them multiple times with the same
 * arguments leaves exactly one matching element in `document.head`.
 */
export class SEOManager {
  /**
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
   * - When `data` is non-null: upserts the script with `JSON.stringify(data, null, 2)`
   * - When `data` is `null`: removes any existing such script (no-op if absent)
   *
   * @param data - JSON-LD structured data object, or `null` to remove
   */
  static upsertJsonLd(data: Record<string, unknown> | null): void {
    const selector = 'script[type="application/ld+json"][data-seo="true"]';
    const existing = document.head.querySelector<HTMLScriptElement>(selector);
    // v2.6.35: read the CSP nonce injected by the Vite `cspNoncePlugin`
    // (see `vite.config.ts`). The nonce is REQUIRED for the JSON-LD
    // script to pass the strict meta tag CSP (`script-src 'self'
    // 'nonce-...'`). The nonce is also required for the 2 static
    // inline scripts in `index.html` (the theme IIFE + the Speculation
    // Rules JSON), which the Vite plugin nonces at build time.
    // The `.htaccess` HTTP header CSP retains `'unsafe-inline'` as a
    // fallback for the JSON-LD injection (the meta tag is the EFFECTIVE
    // policy per W3C CSP3 AND-logic of multiple policies — a script
    // must pass ALL policies, so the meta tag's nonce requirement is
    // the binding constraint; an XSS payload without the nonce is
    // blocked by the meta tag regardless of `'unsafe-inline'` in the
    // HTTP header).
    const nonce = document.documentElement.dataset.cspNonce ?? '';

    if (data === null) {
      if (existing !== null) {
        existing.remove();
      }
      return;
    }

    if (existing !== null) {
      existing.textContent = JSON.stringify(data, null, 2);
      // Re-apply the nonce in case the page was hot-reloaded and the
      // nonce rotated (dev server only; production has a per-build
      // nonce that's stable for the lifetime of the page).
      if (nonce) existing.setAttribute('nonce', nonce);
    } else {
      const el = document.createElement('script');
      el.setAttribute('type', 'application/ld+json');
      el.setAttribute('data-seo', 'true');
      if (nonce) el.setAttribute('nonce', nonce);
      el.textContent = JSON.stringify(data, null, 2);
      document.head.appendChild(el);
    }
  }

  /**
   * - Removes all existing such elements first (full replace, not merge)
   * - Appends one `<link rel="alternate" hreflang="{locale}" href="{url}" data-seo="true">`
   *   per `[locale, url]` entry
   *
   * @param alternates - Map of locale → absolute URL
   */
  static upsertHreflang(alternates: Record<string, string>): void {
    const existing = document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][data-seo="true"]',
    );
    existing.forEach((el) => el.remove());

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
   * Sets the page title and upserts all standard meta tags, Open Graph tags,
   * Twitter Card tags, canonical URL, hreflang alternates, and JSON-LD
   * structured data according to the design's algorithm.
   *
   * @param resolved - The fully-resolved SEO configuration
   */
  static apply(resolved: ResolvedSEOConfig): void {
    document.title = resolved.title;

    SEOManager.upsertMeta('description', resolved.description, 'name');
    SEOManager.upsertMeta('robots', 'index, follow', 'name');

    SEOManager.upsertMeta('og:type', resolved.ogType, 'property');
    SEOManager.upsertMeta('og:title', resolved.title, 'property');
    SEOManager.upsertMeta('og:description', resolved.description, 'property');
    SEOManager.upsertMeta('og:url', resolved.canonicalUrl, 'property');
    SEOManager.upsertMeta('og:image', resolved.ogImage, 'property');
    SEOManager.upsertMeta('og:site_name', 'JAJAT', 'property');
    SEOManager.upsertMeta('og:locale', currentLocale(), 'property');

    SEOManager.upsertMeta('twitter:card', 'summary_large_image', 'name');
    SEOManager.upsertMeta('twitter:title', resolved.title, 'name');
    SEOManager.upsertMeta('twitter:description', resolved.description, 'name');
    SEOManager.upsertMeta('twitter:image', resolved.ogImage, 'name');

    SEOManager.upsertCanonical(resolved.canonicalUrl);

    SEOManager.upsertHreflang(resolved.alternates);

    SEOManager.upsertJsonLd(resolved.structuredData);
  }
}
