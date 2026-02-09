// chrome-extension/job-extractors/AshbyhqJobExtractor.ts
// AshbyHQ-specific job data extractor
//
// Note: Content scripts run in an isolated world and cannot access window.__appData
// set by the page. We prioritize JSON-LD and meta/title (available in the DOM).

import { JobExtractor, JobData } from './JobExtractor';

interface AshbyAppData {
  posting?: Record<string, unknown> & {
    title?: string;
    locationName?: string;
    workplaceType?: string;
    descriptionPlainText?: string;
    descriptionHtml?: string;
    compensationTierSummary?: string;
    publishedDate?: string;
  };
  organization?: {
    name?: string;
  };
}

interface WindowWithAppData extends Window {
  __appData?: AshbyAppData;
}

type JsonLdJobPosting = Record<string, unknown> & {
  title?: string;
  description?: string;
  datePosted?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } };
  jobLocationType?: string;
  employmentType?: string;
  baseSalary?: {
    currency?: string;
    value?: { minValue?: number; maxValue?: number; unitText?: string };
  };
};

export class AshbyhqJobExtractor implements JobExtractor {
  readonly name = 'AshbyHQ';

  /** Cached JSON-LD for the current extraction (content script cannot use window.__appData). */
  private _cachedJsonLd: JsonLdJobPosting | null | undefined = undefined;
  /** Cached __appData parsed from script text (fallback when JSON-LD missing e.g. SPA). */
  private _cachedAppData: AshbyAppData | null | undefined = undefined;

  canHandle(url: string): boolean {
    return url.includes('jobs.ashbyhq.com') || url.includes('ashbyhq.com');
  }

  /**
   * Get parsed JobPosting from script[type="application/ld+json"].
   * Tries all JSON-LD scripts (in case the first is not JobPosting).
   * Uses cache so we only parse once per extract() run.
   */
  private getJsonLd(): JsonLdJobPosting | null {
    if (this._cachedJsonLd !== undefined) {
      return this._cachedJsonLd;
    }
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const raw = scripts[i].textContent?.trim();
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as JsonLdJobPosting;
          if (parsed['@type'] === 'JobPosting') {
            this._cachedJsonLd = parsed;
            return this._cachedJsonLd;
          }
          const graph = parsed['@graph'] as JsonLdJobPosting[] | undefined;
          if (Array.isArray(graph)) {
            const jobPosting = graph.find((item) => item['@type'] === 'JobPosting');
            if (jobPosting) {
              this._cachedJsonLd = jobPosting;
              return this._cachedJsonLd;
            }
          }
        } catch {
          continue;
        }
      }
      this._cachedJsonLd = null;
      return null;
    } catch {
      this._cachedJsonLd = null;
      return null;
    }
  }

  /**
   * Fallback: read posting/organization from the inline script that sets window.__appData.
   * Content scripts cannot read window.__appData, but we can read the script's textContent.
   */
  private getAppDataFromScript(): AshbyAppData | null {
    try {
      const scripts = document.querySelectorAll('script:not([type="application/ld+json"])');
      for (let i = 0; i < scripts.length; i++) {
        const raw = scripts[i].textContent || '';
        const startMarker = 'window.__appData';
        const idx = raw.indexOf(startMarker);
        if (idx === -1 || !raw.includes('"posting"')) continue;
        const open = raw.indexOf('{', idx);
        if (open === -1) continue;
        let depth = 0;
        let end = -1;
        let inString = false;
        let escape = false;
        let quoteChar = '"';
        for (let j = open; j < raw.length; j++) {
          const c = raw[j];
          if (escape) {
            escape = false;
            continue;
          }
          if (c === '\\' && inString) {
            escape = true;
            continue;
          }
          if (!inString) {
            if (c === '"' || c === "'") {
              inString = true;
              quoteChar = c;
            } else if (c === '{') depth++;
            else if (c === '}') {
              depth--;
              if (depth === 0) {
                end = j;
                break;
              }
            }
          } else if (c === quoteChar) {
            inString = false;
          }
        }
        if (end === -1) continue;
        const jsonStr = raw.slice(open, end + 1);
        const parsed = JSON.parse(jsonStr) as AshbyAppData;
        if (parsed?.posting || parsed?.organization) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private getAppData(): AshbyAppData | null {
    if (this._cachedAppData !== undefined) return this._cachedAppData;
    try {
      const fromWindow = (window as WindowWithAppData).__appData;
      if (fromWindow?.posting || fromWindow?.organization) {
        this._cachedAppData = fromWindow;
        return this._cachedAppData;
      }
    } catch {
      // ignore
    }
    this._cachedAppData = this.getAppDataFromScript();
    return this._cachedAppData;
  }

  extractJobTitle(): string {
    // 1. JSON-LD (available in DOM in content script)
    const jsonLd = this.getJsonLd();
    if (jsonLd?.title) {
      return String(jsonLd.title).trim();
    }

    // 2. Meta and title
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    if (ogTitle?.content) {
      return ogTitle.content.trim();
    }
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      const match = titleText.match(/^(.+?)\s+@/);
      if (match) {
        return match[1].trim();
      }
      return titleText;
    }

    // 3. __appData (from script text or window)
    const appData = this.getAppData();
    if (appData?.posting?.title) {
      return String(appData.posting.title);
    }

    return '';
  }

  extractCompanyName(): string {
    // 1. JSON-LD
    const jsonLd = this.getJsonLd();
    if (jsonLd?.hiringOrganization?.name) {
      return String(jsonLd.hiringOrganization.name).trim();
    }

    // 2. Title tag (format: "Job Title @ Company")
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      const match = titleText.match(/@\s*(.+?)$/);
      if (match) {
        return match[1].trim();
      }
    }

    // 3. __appData
    const appData = this.getAppData();
    if (appData?.organization?.name) {
      return String(appData.organization.name);
    }

    return '';
  }

  extractLocation(): string {
    // 1. JSON-LD
    const jsonLd = this.getJsonLd();
    if (jsonLd?.jobLocation?.address) {
      const address = jsonLd.jobLocation.address;
      const parts = [
        address.addressLocality,
        address.addressRegion,
        address.addressCountry
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.map(String).join(', ');
      }
    }

    // 2. __appData
    const appData = this.getAppData();
    if (appData?.posting?.locationName) {
      return String(appData.posting.locationName);
    }

    return '';
  }

  extractJobType(): string {
    // 1. JSON-LD
    const jsonLd = this.getJsonLd();
    if (jsonLd?.jobLocationType === 'TELECOMMUTE') {
      return 'Remote';
    }
    if (jsonLd?.employmentType) {
      const et = String(jsonLd.employmentType);
      if (et === 'FULL_TIME') return 'Full-time';
      if (et === 'PART_TIME') return 'Part-time';
      if (et === 'CONTRACTOR') return 'Contract';
      if (et === 'INTERN') return 'Internship';
      return et;
    }

    // 2. __appData
    const appData = this.getAppData();
    if (appData?.posting?.workplaceType) {
      const w = String(appData.posting.workplaceType);
      if (w === 'Remote' || w === 'Hybrid') return w;
      if (w === 'OnSite') return 'On-site';
    }
    if (appData?.posting && (appData.posting as Record<string, unknown>).isRemote === true) {
      return 'Remote';
    }

    return '';
  }

  extractJobDescription(): string {
    const limit = 1000;

    // 1. JSON-LD (description often contains HTML)
    const jsonLd = this.getJsonLd();
    if (jsonLd?.description) {
      const raw = String(jsonLd.description);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = raw;
      const text = tempDiv.textContent?.trim() || '';
      if (text.length > 0) {
        const out = text.length > limit ? text.substring(0, limit) + '...' : text;
        return out;
      }
    }

    // 2. Meta description
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (metaDesc?.content) {
      const text = metaDesc.content.trim();
      if (text.length > 0) {
        return text.length > limit ? text.substring(0, limit) + '...' : text;
      }
    }

    // 3. __appData
    const appData = this.getAppData();
    if (appData?.posting?.descriptionPlainText) {
      const text = String(appData.posting.descriptionPlainText).trim();
      if (text.length > 0) {
        return text.length > limit ? text.substring(0, limit) + '...' : text;
      }
    }
    if (appData?.posting?.descriptionHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = String(appData.posting.descriptionHtml);
      const text = tempDiv.textContent?.trim() || '';
      if (text.length > 0) {
        return text.length > limit ? text.substring(0, limit) + '...' : text;
      }
    }

    return '';
  }

  extractSalary(): string {
    // 1. JSON-LD
    const jsonLd = this.getJsonLd();
    if (jsonLd?.baseSalary) {
      const salary = jsonLd.baseSalary;
      const currency = salary.currency || '';
      const val = salary.value;
      const minValue = val?.minValue;
      const maxValue = val?.maxValue;
      const unitText = (val?.unitText || '').toUpperCase();
      if (minValue != null && maxValue != null) {
        const a = typeof minValue === 'number' ? minValue.toLocaleString() : minValue;
        const b = typeof maxValue === 'number' ? maxValue.toLocaleString() : maxValue;
        return `${currency}${a} – ${currency}${b} ${unitText}`.trim();
      }
      if (minValue != null) {
        const a = typeof minValue === 'number' ? minValue.toLocaleString() : minValue;
        return `${currency}${a} ${unitText}`.trim();
      }
    }

    // 2. __appData
    const appData = this.getAppData();
    if (appData?.posting?.compensationTierSummary) {
      return String(appData.posting.compensationTierSummary);
    }
    const tiers = (appData?.posting as Record<string, unknown>)?.compensationTiers;
    if (Array.isArray(tiers) && tiers.length > 0) {
      const tier = tiers[0] as { tierSummary?: string };
      if (tier?.tierSummary) return tier.tierSummary;
    }
    const scrapeable = (appData?.posting as Record<string, unknown>)?.scrapeableCompensationSalarySummary;
    if (scrapeable) {
      return String(scrapeable);
    }

    return '';
  }

  extract(): JobData {
    this._cachedJsonLd = undefined;
    this._cachedAppData = undefined;
    const data: JobData = {};

    try {
      const position = this.extractJobTitle();
      if (position) data.position = position;

      const company = this.extractCompanyName();
      if (company) data.company = company;

      const location = this.extractLocation();
      if (location) data.location = location;

      const jobType = this.extractJobType();
      if (jobType) data.jobType = jobType;

      const description = this.extractJobDescription();
      if (description) data.description = description;

      const salary = this.extractSalary();
      if (salary) data.salary = salary;

      // Posted date: JSON-LD first (available in content script), then __appData
      try {
        const jsonLd = this.getJsonLd();
        if (jsonLd?.datePosted) {
          const date = new Date(String(jsonLd.datePosted));
          if (!isNaN(date.getTime())) {
            data.postedDate = date.toISOString().split('T')[0];
          }
        } else {
          const appData = this.getAppData();
          const publishedDate = appData?.posting?.publishedDate;
          if (publishedDate) {
            const date = new Date(String(publishedDate));
            if (!isNaN(date.getTime())) {
              data.postedDate = date.toISOString().split('T')[0];
            }
          }
        }
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Error extracting job data from AshbyHQ:', error);
    } finally {
      this._cachedJsonLd = undefined;
      this._cachedAppData = undefined;
    }

    return data;
  }
}
