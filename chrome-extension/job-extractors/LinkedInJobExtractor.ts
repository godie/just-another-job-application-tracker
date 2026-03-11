// chrome-extension/job-extractors/LinkedInJobExtractor.ts
// LinkedIn-specific job data extractor

import { JobExtractor, JobData } from './JobExtractor';

export class LinkedInJobExtractor implements JobExtractor {
  readonly name = 'LinkedIn';

  canHandle(url: string): boolean {
    return url.includes('linkedin.com/jobs/view/') || url.includes('linkedin.com/jobs/collections/');
  }

  extractJobTitle(): string {
    // Extract position/title
    let title = '';
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-details-top-card__job-title',
      'h1[data-test-id="job-title"]',
      'h1.job-details-jobs-unified-top-card__job-title',
    ];
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        title = element.textContent?.trim() || '';
        break;
      }
    }
    return title;
  }

  extractCompanyName(): string {
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-details-top-card__company-name',
      'a[data-test-id="job-company-name"]',
      'a[data-test-id="job-company-link"]',
      '.jobs-details-top-card__company-info a',
      '.jobs-unified-top-card__company-name',
      '.jobs-details-top-card__company-link',
    ];
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  extractLocation(): string {
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-without-tagline',
      '.jobs-details-top-card__primary-description',
      '.jobs-details-top-card__primary-description-without-tagline',
      '.job-details-jobs-unified-top-card__primary-description',
    ];
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        // Format is usually: "Location · Job Type" or "Location · Job Type · Posted X days ago"
        const parts = text.split('·').map(p => p.trim());
        if (parts.length > 0) {
          return parts[0];
        }
      }
    }
    return '';
  }

  extractJobType(): string {
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-without-tagline',
      '.jobs-details-top-card__primary-description',
      '.jobs-details-top-card__primary-description-without-tagline',
      '.job-details-jobs-unified-top-card__primary-description',
    ];
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        const parts = text.split('·').map(p => p.trim());
        
        // Check each part for job type keywords
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].toLowerCase();
          if (part.includes('remote') || part.includes('remoto') || part.includes('en remoto')) {
            return parts[i];
          } else if (part.includes('hybrid') || part.includes('híbrido')) {
            return parts[i];
          } else if (part.includes('on-site') || part.includes('onsite') || part.includes('presencial')) {
            return parts[i];
          }
        }
      }
    }

    // Check other common areas for job type if not found in primary description
    const insightSelectors = [
      '.job-details-jobs-unified-top-card__job-insight',
      '.jobs-details-top-card__job-insight',
    ];
    for (const selector of insightSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('remote') || text.includes('remoto') || text.includes('en remoto')) {
          return element.textContent?.trim() || '';
        } else if (text.includes('hybrid') || text.includes('híbrido')) {
          return element.textContent?.trim() || '';
        } else if (text.includes('on-site') || text.includes('onsite') || text.includes('presencial')) {
          return element.textContent?.trim() || '';
        }
      }
    }

    return '';
  }

  extractJobDescription(): string {
    const descriptionSelectors = [
      '.jobs-description__text',
      '.jobs-description-content__text',
      '[data-test-id="job-description"]',
      '.jobs-box__html-content',
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
      '.job-details-jobs-unified-top-card__job-insight',
      '.jobs-details-top-card__job-insight',
      '[data-test-id="job-salary"]',
      '.job-details-jobs-unified-top-card__job-insight-text-item',
      '.jobs-unified-top-card__job-insight',
      '.salary-range',
    ];
    for (const selector of salarySelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const text = element.textContent?.trim() || '';
        const textLower = text.toLowerCase();
        // Look for currency symbols or keywords
        if (textLower.match(/[$€£]\s*[\d,]+/) ||
            textLower.includes('salary') ||
            textLower.includes('compensation') ||
            textLower.includes('salario') ||
            textLower.includes('remuneración')) {
          return text;
        }
      }
    }

    // Try finding in description if not found in insights
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

      // Extract posted date
      const dateSelectors = [
        '.job-details-jobs-unified-top-card__primary-description-without-tagline',
        '.jobs-details-top-card__primary-description',
        '.job-details-jobs-unified-top-card__primary-description',
        'time',
        '.jobs-unified-top-card__posted-date',
      ];
      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // If it's a <time> element, it might have a datetime attribute
          if (element.tagName && element.tagName.toLowerCase() === 'time') {
            const datetime = element.getAttribute('datetime');
            if (datetime) {
              const date = new Date(datetime);
              if (!isNaN(date.getTime())) {
                data.postedDate = date.toISOString().split('T')[0];
                break;
              }
            }
          }

          const text = element.textContent || '';
          // Look for various date formats:
          // English: "Posted X days ago", "X days ago", "X weeks ago", "X months ago"
          // Spanish: "Hace X semanas", "Hace X días", "Publicado hace X días", "Hace X meses"
          const postedMatch = text.match(/posted\s+(\d+)\s+days?\s+ago/i) ||
                             text.match(/(\d+)\s+days?\s+ago/i) ||
                             text.match(/hace\s+(\d+)\s+d[ií]as?/i) ||
                             text.match(/publicado\s+hace\s+(\d+)\s+d[ií]as?/i) ||
                             text.match(/posted\s+(\d+)\s+weeks?\s+ago/i) ||
                             text.match(/(\d+)\s+weeks?\s+ago/i) ||
                             text.match(/hace\s+(\d+)\s+semanas?/i) ||
                             text.match(/posted\s+(\d+)\s+months?\s+ago/i) ||
                             text.match(/(\d+)\s+months?\s+ago/i) ||
                             text.match(/hace\s+(\d+)\s+meses/i);
          
          if (postedMatch) {
            const value = parseInt(postedMatch[1], 10);
            const date = new Date();
            
            const lowerText = text.toLowerCase();
            if (lowerText.includes('semanas') || lowerText.includes('weeks')) {
              date.setDate(date.getDate() - (value * 7));
            } else if (lowerText.includes('meses') || lowerText.includes('months')) {
              date.setMonth(date.getMonth() - value);
            } else {
              date.setDate(date.getDate() - value);
            }
            
            data.postedDate = date.toISOString().split('T')[0];
            break;
          }
        }
      }

    } catch (error) {
      console.error('Error extracting job data from LinkedIn:', error);
    }

    return data;
  }
}

