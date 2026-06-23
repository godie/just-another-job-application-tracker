/** Per-page SEO configuration passed to useSEO() */
export interface SEOConfig {
  /** Browser tab title. Appended with " | JAJAT" unless suppressSuffix is true. */
  title: string;
  /** Meta description (max 160 chars recommended). */
  description?: string;
  /** Canonical URL for this page. Defaults to window.location.href. */
  canonicalUrl?: string;
  /** Open Graph image URL. Defaults to DEFAULT_OG_IMAGE. */
  ogImage?: string;
  /** Open Graph type. Defaults to "website". */
  ogType?: 'website' | 'article' | 'profile';
  /** JSON-LD structured data object. Omit to skip injection. */
  structuredData?: Record<string, unknown>;
  /** When true, title is used verbatim without " | JAJAT" suffix. */
  suppressSuffix?: boolean;
  /** hreflang alternate links: locale → absolute URL */
  alternates?: Record<string, string>;
}

/** Resolved config after defaults are applied — all fields are required. */
export interface ResolvedSEOConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: 'website' | 'article' | 'profile';
  structuredData: Record<string, unknown> | null;
  alternates: Record<string, string>;
}

/** Return value of useSEO() — exposes resolved config for testing. */
export interface SEOResult {
  resolved: ResolvedSEOConfig;
}
