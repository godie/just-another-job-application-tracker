import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSEOConfig } from './resolve';
import { SEOManager } from './SEOManager';
import { SEO_DEFAULTS } from './constants';
import type { SEOConfig } from './types';


describe('resolveSEOConfig', () => {
  const baseConfig: SEOConfig = {
    title: 'My Page',
    description: 'A test description',
  };

  it('appends " | JAJAT" suffix by default', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.title).toBe('My Page | JAJAT');
  });

  it('does not append suffix when suppressSuffix is true', () => {
    const resolved = resolveSEOConfig(
      { ...baseConfig, suppressSuffix: true },
      SEO_DEFAULTS,
    );
    expect(resolved.title).toBe('My Page');
  });

  it('appends suffix when suppressSuffix is false', () => {
    const resolved = resolveSEOConfig(
      { ...baseConfig, suppressSuffix: false },
      SEO_DEFAULTS,
    );
    expect(resolved.title).toBe('My Page | JAJAT');
  });

  it('preserves description without modification', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.description).toBe(baseConfig.description);
  });

  it('falls back to defaults.baseUrl for canonicalUrl when omitted', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.canonicalUrl).toBe(SEO_DEFAULTS.baseUrl);
  });

  it('uses provided canonicalUrl when given', () => {
    const resolved = resolveSEOConfig(
      { ...baseConfig, canonicalUrl: 'https://example.com/page' },
      SEO_DEFAULTS,
    );
    expect(resolved.canonicalUrl).toBe('https://example.com/page');
  });

  it('falls back to defaults.ogImage for ogImage when omitted', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.ogImage).toBe(SEO_DEFAULTS.ogImage);
  });

  it('uses provided ogImage when given', () => {
    const resolved = resolveSEOConfig(
      { ...baseConfig, ogImage: 'https://example.com/img.png' },
      SEO_DEFAULTS,
    );
    expect(resolved.ogImage).toBe('https://example.com/img.png');
  });

  it('defaults ogType to "website" when omitted', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.ogType).toBe('website');
  });

  it('uses provided ogType when given', () => {
    const resolved = resolveSEOConfig(
      { ...baseConfig, ogType: 'article' },
      SEO_DEFAULTS,
    );
    expect(resolved.ogType).toBe('article');
  });

  it('defaults structuredData to null when omitted', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.structuredData).toBeNull();
  });

  it('uses provided structuredData when given', () => {
    const data = { '@type': 'WebPage', name: 'Test' };
    const resolved = resolveSEOConfig(
      { ...baseConfig, structuredData: data },
      SEO_DEFAULTS,
    );
    expect(resolved.structuredData).toEqual(data);
  });

  it('defaults alternates to {} when omitted', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.alternates).toEqual({});
  });

  it('uses provided alternates when given', () => {
    const alternates = { en: 'https://example.com/?lang=en', es: 'https://example.com/?lang=es' };
    const resolved = resolveSEOConfig(
      { ...baseConfig, alternates },
      SEO_DEFAULTS,
    );
    expect(resolved.alternates).toEqual(alternates);
  });

  it('returns a config with no undefined fields', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    for (const [key, value] of Object.entries(resolved)) {
      expect(value, `field "${key}" should not be undefined`).not.toBeUndefined();
    }
  });

  it('canonicalUrl always starts with "http"', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.canonicalUrl.startsWith('http')).toBe(true);
  });

  it('ogImage always starts with "http"', () => {
    const resolved = resolveSEOConfig(baseConfig, SEO_DEFAULTS);
    expect(resolved.ogImage.startsWith('http')).toBe(true);
  });

  it('does not mutate the config object', () => {
    const config: SEOConfig = { ...baseConfig };
    const configCopy = { ...config };
    resolveSEOConfig(config, SEO_DEFAULTS);
    expect(config).toEqual(configCopy);
  });

  it('does not mutate the defaults object', () => {
    const defaults = { ...SEO_DEFAULTS };
    const defaultsCopy = { ...SEO_DEFAULTS };
    resolveSEOConfig(baseConfig, defaults);
    expect(defaults).toEqual(defaultsCopy);
  });
});


describe('SEOManager.upsertMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('appends a new <meta name> element when none exists', () => {
    SEOManager.upsertMeta('description', 'Hello world');
    const metas = document.head.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute('content')).toBe('Hello world');
  });

  it('updates content in-place when element already exists', () => {
    SEOManager.upsertMeta('description', 'First');
    SEOManager.upsertMeta('description', 'Second');
    const metas = document.head.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute('content')).toBe('Second');
  });

  it('is idempotent — calling N times leaves exactly one element', () => {
    SEOManager.upsertMeta('robots', 'index, follow');
    SEOManager.upsertMeta('robots', 'index, follow');
    SEOManager.upsertMeta('robots', 'index, follow');
    const metas = document.head.querySelectorAll('meta[name="robots"]');
    expect(metas.length).toBe(1);
  });

  it('uses "property" attribute when attr is "property"', () => {
    SEOManager.upsertMeta('og:title', 'My Title', 'property');
    const metas = document.head.querySelectorAll('meta[property="og:title"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute('content')).toBe('My Title');
  });

  it('updates property meta in-place', () => {
    SEOManager.upsertMeta('og:type', 'website', 'property');
    SEOManager.upsertMeta('og:type', 'article', 'property');
    const metas = document.head.querySelectorAll('meta[property="og:type"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute('content')).toBe('article');
  });

  it('defaults attr to "name" when omitted', () => {
    SEOManager.upsertMeta('twitter:card', 'summary_large_image');
    const byName = document.head.querySelector('meta[name="twitter:card"]');
    expect(byName).not.toBeNull();
    expect(byName!.getAttribute('content')).toBe('summary_large_image');
  });
});


describe('SEOManager.upsertCanonical', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('appends a new <link rel="canonical"> when none exists', () => {
    SEOManager.upsertCanonical('https://example.com/');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://example.com/');
  });

  it('updates href in-place when element already exists', () => {
    SEOManager.upsertCanonical('https://example.com/old');
    SEOManager.upsertCanonical('https://example.com/new');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://example.com/new');
  });

  it('is idempotent — calling N times leaves exactly one element', () => {
    SEOManager.upsertCanonical('https://example.com/');
    SEOManager.upsertCanonical('https://example.com/');
    SEOManager.upsertCanonical('https://example.com/');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
  });
});


describe('SEOManager.upsertJsonLd', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  const selector = 'script[type="application/ld+json"][data-seo="true"]';

  it('appends a new JSON-LD script when none exists', () => {
    const data = { '@type': 'WebPage', name: 'Test' };
    SEOManager.upsertJsonLd(data);
    const scripts = document.head.querySelectorAll(selector);
    expect(scripts.length).toBe(1);
  });

  it('serializes data with JSON.stringify(data, null, 2)', () => {
    const data = { '@type': 'WebPage', name: 'Test' };
    SEOManager.upsertJsonLd(data);
    const script = document.head.querySelector(selector);
    expect(script!.textContent).toBe(JSON.stringify(data, null, 2));
  });

  it('round-trips: JSON.parse(textContent) deeply equals original data', () => {
    const data = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'JAJAT' };
    SEOManager.upsertJsonLd(data);
    const script = document.head.querySelector(selector);
    expect(JSON.parse(script!.textContent!)).toEqual(data);
  });

  it('updates textContent in-place when called again with new data', () => {
    SEOManager.upsertJsonLd({ name: 'First' });
    SEOManager.upsertJsonLd({ name: 'Second' });
    const scripts = document.head.querySelectorAll(selector);
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent!)).toEqual({ name: 'Second' });
  });

  it('removes the script element when called with null', () => {
    SEOManager.upsertJsonLd({ name: 'Test' });
    SEOManager.upsertJsonLd(null);
    const scripts = document.head.querySelectorAll(selector);
    expect(scripts.length).toBe(0);
  });

  it('is a no-op when called with null and no script exists', () => {
    expect(() => SEOManager.upsertJsonLd(null)).not.toThrow();
    const scripts = document.head.querySelectorAll(selector);
    expect(scripts.length).toBe(0);
  });
});


describe('SEOManager.upsertHreflang', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  const selector = 'link[rel="alternate"][data-seo="true"]';

  it('appends one element per entry in alternates', () => {
    SEOManager.upsertHreflang({
      en: 'https://example.com/?lang=en',
      es: 'https://example.com/?lang=es',
    });
    const links = document.head.querySelectorAll(selector);
    expect(links.length).toBe(2);
  });

  it('count matches Object.keys(alternates).length', () => {
    const alternates = {
      en: 'https://example.com/?lang=en',
      es: 'https://example.com/?lang=es',
      'x-default': 'https://example.com/',
    };
    SEOManager.upsertHreflang(alternates);
    const links = document.head.querySelectorAll(selector);
    expect(links.length).toBe(Object.keys(alternates).length);
  });

  it('sets correct hreflang and href attributes', () => {
    SEOManager.upsertHreflang({ en: 'https://example.com/?lang=en' });
    const link = document.head.querySelector(selector);
    expect(link!.getAttribute('hreflang')).toBe('en');
    expect(link!.getAttribute('href')).toBe('https://example.com/?lang=en');
  });

  it('replaces all existing alternates on subsequent calls', () => {
    SEOManager.upsertHreflang({ en: 'https://example.com/?lang=en' });
    SEOManager.upsertHreflang({ es: 'https://example.com/?lang=es', fr: 'https://example.com/?lang=fr' });
    const links = document.head.querySelectorAll(selector);
    expect(links.length).toBe(2);
  });

  it('removes all alternates when called with empty object', () => {
    SEOManager.upsertHreflang({ en: 'https://example.com/?lang=en' });
    SEOManager.upsertHreflang({});
    const links = document.head.querySelectorAll(selector);
    expect(links.length).toBe(0);
  });
});


describe('SEOManager.apply', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  const resolved = {
    title: 'Test Page | JAJAT',
    description: 'A test description for the page.',
    canonicalUrl: 'https://jajat.godieboy.com/test',
    ogImage: 'https://jajat.godieboy.com/jajat-logo.png',
    ogType: 'website' as const,
    structuredData: null,
    alternates: {},
  };

  it('sets document.title', () => {
    SEOManager.apply(resolved);
    expect(document.title).toBe('Test Page | JAJAT');
  });

  it('upserts meta description', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.description);
  });

  it('upserts meta robots', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe('index, follow');
  });

  it('upserts og:title', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:title"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.title);
  });

  it('upserts og:description', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.description);
  });

  it('upserts og:url', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:url"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.canonicalUrl);
  });

  it('upserts og:image', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:image"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.ogImage);
  });

  it('upserts og:type', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:type"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.ogType);
  });

  it('upserts og:site_name', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[property="og:site_name"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe('JAJAT');
  });

  it('upserts twitter:card', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="twitter:card"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe('summary_large_image');
  });

  it('upserts twitter:title', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="twitter:title"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.title);
  });

  it('upserts twitter:description', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="twitter:description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.description);
  });

  it('upserts twitter:image', () => {
    SEOManager.apply(resolved);
    const meta = document.head.querySelector('meta[name="twitter:image"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBe(resolved.ogImage);
  });

  it('upserts canonical link', () => {
    SEOManager.apply(resolved);
    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(resolved.canonicalUrl);
  });

  it('is idempotent — calling apply twice leaves no duplicate tags', () => {
    SEOManager.apply(resolved);
    SEOManager.apply(resolved);
    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
  });

  it('injects JSON-LD when structuredData is provided', () => {
    const withData = {
      ...resolved,
      structuredData: { '@type': 'WebApplication', name: 'JAJAT' },
    };
    SEOManager.apply(withData);
    const script = document.head.querySelector(
      'script[type="application/ld+json"][data-seo="true"]',
    );
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent!)).toEqual(withData.structuredData);
  });

  it('does not inject JSON-LD when structuredData is null', () => {
    SEOManager.apply(resolved); // structuredData is null
    const script = document.head.querySelector(
      'script[type="application/ld+json"][data-seo="true"]',
    );
    expect(script).toBeNull();
  });

  it('injects hreflang links when alternates are provided', () => {
    const withAlternates = {
      ...resolved,
      alternates: {
        en: 'https://jajat.godieboy.com/?lang=en',
        es: 'https://jajat.godieboy.com/?lang=es',
      },
    };
    SEOManager.apply(withAlternates);
    const links = document.head.querySelectorAll(
      'link[rel="alternate"][data-seo="true"]',
    );
    expect(links.length).toBe(2);
  });
});
