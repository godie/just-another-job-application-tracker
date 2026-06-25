export interface SEOConfig {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  structuredData?: Record<string, unknown>;
  suppressSuffix?: boolean;
  alternates?: Record<string, string>;
}

export interface ResolvedSEOConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: 'website' | 'article' | 'profile';
  structuredData: Record<string, unknown> | null;
  alternates: Record<string, string>;
}

export interface SEOResult {
  resolved: ResolvedSEOConfig;
}
