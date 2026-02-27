// chrome-extension/job-extractors/GreenhouseJobExtractor.ts
// Greenhouse-specific job data extractor

import { JobExtractor, JobData } from './JobExtractor';

interface RemixContext {
  state?: {
    loaderData?: {
      [key: string]: {
        jobPost?: {
          company_name?: string;
          published_at?: string;
        };
      };
    };
  };
}

interface WindowWithRemixContext extends Window {
  __remixContext?: RemixContext;
}

export class GreenhouseJobExtractor implements JobExtractor {
  readonly name = 'Greenhouse';

  canHandle(url: string): boolean {
    return url.includes('boards.greenhouse.io') || 
           url.includes('job-boards.greenhouse.io') ||
           url.includes('greenhouse.io/jobs');
  }

  extractJobTitle(): string {
    const titleSelectors = [
      '.job__title h1',
      'h1.section-header',
      'h1.section-header--large',
      '.job__header h1',
      'h1',
    ];
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  extractCompanyName(): string {
    let companyName = '';
    
    // Try to extract from window.__remixContext state (embedded JSON)
    try {
      const remixContext = (window as WindowWithRemixContext).__remixContext;
      if (remixContext?.state?.loaderData) {
        const routes = remixContext.state.loaderData;
        const routeKey = Object.keys(routes).find(key => key.includes('job_post_id'));
        if (routeKey && routes[routeKey]?.jobPost?.company_name) {
          companyName = routes[routeKey].jobPost.company_name;
        }
      }
    } catch {
      // Fallback to other methods
    }

    // If not found in state, try meta tags and common selectors
    if (!companyName) {
      const companySelectors = [
        'meta[property="og:site_name"]',
        'meta[name="application-name"]',
        '.company-name',
        '[data-testid="company-name"]',
        '#header .company-name',
      ];
      for (const selector of companySelectors) {
        if (selector.startsWith('meta')) {
          const element = document.querySelector(selector) as HTMLMetaElement;
          if (element?.content) {
            companyName = element.content;
            break;
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            companyName = element.textContent?.trim() || '';
            break;
          }
        }
      }
    }

    // If still not found, try to extract from logo alt text or URL
    if (!companyName) {
      const logoSelectors = ['.logo img', '#logo img', '[class*="logo"] img'];
      for (const selector of logoSelectors) {
        const logoElement = document.querySelector(selector) as HTMLImageElement;
        if (logoElement?.alt) {
          const altMatch = logoElement.alt.match(/(.+?)\s+Logo/i) || [null, logoElement.alt];
          if (altMatch[1]) {
            companyName = altMatch[1].trim();
            break;
          }
        }
      }
    }

    return companyName;
  }

  extractLocation(): string {
    const locationSelectors = [
      '.job__location div',
      '.job__location',
      '.job__header .job__location',
    ];
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const locationText = element.textContent?.trim() || '';
        if (locationText) {
          // Location format is usually "Remote - Canada" or "City, State" or "Remote"
          // Extract just the location part (before the dash if it exists)
          const parts = locationText.split('-').map(p => p.trim());
          // If it starts with "Remote", "Hybrid", etc., return the full text
          // Otherwise return the first part
          return parts[0];
        }
      }
    }
    return '';
  }

  extractJobType(): string {
    const locationSelectors = [
      '.job__location div',
      '.job__location',
      '.job__header .job__location',
    ];
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const locationText = element.textContent?.trim() || '';
        if (locationText) {
          // Extract job type from location text
          const locationLower = locationText.toLowerCase();
          if (locationLower.includes('remote') || locationLower.includes('remoto')) {
            return 'Remote';
          } else if (locationLower.includes('hybrid')) {
            return 'Hybrid';
          } else if (locationLower.includes('on-site') || locationLower.includes('onsite') || locationLower.includes('presencial')) {
            return 'On-site';
          }
        }
      }
    }
    return '';
  }

  extractJobDescription(): string {
    const descriptionSelectors = [
      '.job__description',
      '.job__description .body',
      '[class*="job-description"]',
    ];
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Get text content, limit to first 1000 characters
        const text = element.textContent?.trim() || '';
        if (text.length > 100) {
          const description = text.substring(0, 1000);
          return text.length > 1000 ? description + '...' : description;
        }
      }
    }
    return '';
  }

  extractSalary(): string {
    const salarySelectors = [
      '.job__pay-ranges .body',
      '.pay-range .body',
      '.pay-range p.body',
      '.pay-range',
      '[data-testid="pay-range"]',
    ];
    for (const selector of salarySelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const text = element.textContent?.trim() || '';
        // Look for salary patterns like "$180,000 - $230,000 CAD" or keywords
        if (text.match(/[$€£]\s*[\d,]+/) ||
            text.toLowerCase().includes('salary') ||
            text.toLowerCase().includes('compensation') ||
            text.toLowerCase().includes('salario')) {
          return text;
        }
      }
    }

    // Fallback: search in description for salary patterns
    const description = this.extractJobDescription();
    const salaryRegex = /([$€£]\s*[\d,]+[.\d]*[kKmM]?\s*[-–—]\s*[$€£]\s*[\d,]+[.\d]*[kKmM]?)|([$€£]\s*[\d,]+[.\d]*[kKmM]?\s*(per|a|\/) (year|month|hour|año|mes|hora))/gi;
    const match = description.match(salaryRegex);
    if (match) {
      return match[0];
    }

    return '';
  }

  extract(): JobData {
    const data: JobData = {};

    try {
      // Use individual extractor methods - only add to data if value is not empty
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

      // Extract posted date from React state or try to parse from page
      try {
        const remixContext = (window as WindowWithRemixContext).__remixContext;
        if (remixContext?.state?.loaderData) {
          const routes = remixContext.state.loaderData;
          const routeKey = Object.keys(routes).find(key => key.includes('job_post_id'));
          if (routeKey && routes[routeKey]?.jobPost?.published_at) {
            const publishedDate = routes[routeKey].jobPost.published_at;
            // Parse ISO date string and convert to YYYY-MM-DD format
            const date = new Date(publishedDate);
            if (!isNaN(date.getTime())) {
              data.postedDate = date.toISOString().split('T')[0];
            }
          }
        }
      } catch {
        // Fallback: try to find date in visible text
        const dateSelectors = [
          '[class*="posted"]',
          '[class*="date"]',
        ];
        for (const selector of dateSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || '';
            const postedMatch = text.match(/posted\s+(\d+)\s+days?\s+ago/i) ||
                               text.match(/(\d+)\s+days?\s+ago/i) ||
                               text.match(/hace\s+(\d+)\s+semanas?/i) ||
                               text.match(/hace\s+(\d+)\s+d[ií]as?/i);
            
            if (postedMatch) {
              const daysAgo = parseInt(postedMatch[1], 10);
              const date = new Date();
              
              if (text.toLowerCase().includes('semanas') || text.toLowerCase().includes('weeks')) {
                date.setDate(date.getDate() - (daysAgo * 7));
              } else {
                date.setDate(date.getDate() - daysAgo);
              }
              
              data.postedDate = date.toISOString().split('T')[0];
              break;
            }
          }
        }
      }

    } catch (error) {
      console.error('Error extracting job data from Greenhouse:', error);
    }

    return data;
  }
}

