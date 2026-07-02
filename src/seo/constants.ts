export interface SEODefaults {
  baseUrl: string;
  ogImage: string;
  siteName: string;
  description: string;
}

export const SEO_DEFAULTS: SEODefaults = {
  baseUrl: 'https://jajat.godieboy.com',
  // ogImage points at the prod CDN. Even though the bundle now serves
  // AVIF/WebP variants of the logo locally, social-card crawlers fetch
  // the URL once at scrape time, ignore format negotiation, and cache
  // the response indefinitely — so shipping a smaller format requires
  // uploading it to the prod CDN first. Tracked as followup after the
  // cdn upload lands.
  ogImage: 'https://jajat.godieboy.com/jajat-logo.png',
  siteName: 'JAJAT - Job Application Tracker',
  description: 'Track and manage your job applications — free, private, and open-source.',
};
