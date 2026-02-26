// chrome-extension/job-extractors/IndeedJobExtractor.ts
// Indeed-specific job data extractor

import { JobExtractor, JobData } from './JobExtractor';

export class IndeedJobExtractor implements JobExtractor {
  readonly name = 'Indeed';

  canHandle(url: string): boolean {
    return url.includes('indeed.com/viewjob') ||
           url.includes('indeed.com/jobs') ||
           url.includes('indeed.com/rc/clk');
  }

  extractJobTitle(): string {
    const titleSelectors = [
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '.jobsearch-JobInfoHeader-title-container h1',
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
    const companySelectors = [
      '[data-testid="inline-header-company-name"]',
      '.jobsearch-CompanyInfoContainer a',
      '.jobsearch-InlineCompanyRating div',
      '.jobsearch-JobInfoHeader-companyName',
      'meta[property="og:description"]', // Sometimes company name is in meta description
    ];
    for (const selector of companySelectors) {
      if (selector === 'meta[property="og:description"]') {
        const element = document.querySelector(selector) as HTMLMetaElement;
        if (element?.content) {
          // Meta description often starts with "Apply for [Job] at [Company]"
          const match = element.content.match(/at\s+(.+?)\s+in/i) || element.content.match(/at\s+(.+?)\./i);
          if (match) return match[1].trim();
        }
        continue;
      }
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  extractLocation(): string {
    const locationSelectors = [
      '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
      '.jobsearch-JobInfoHeader-subtitle div:nth-child(2)',
      '.jobsearch-JobInfoHeader-companyLocation',
      '.jobsearch-DesktopStickyContainer-subtitle div:last-child',
    ];
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  extractJobType(): string {
    const selectors = [
      '#salaryInfoAndJobType',
      '.jobsearch-JobMetadataHeader-item',
      '[data-testid="jobsearch-JobMetadataHeader-item"]',
    ];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('remote') || text.includes('remoto')) return 'Remote';
        if (text.includes('hybrid') || text.includes('híbrido')) return 'Hybrid';
        if (text.includes('full-time') || text.includes('tiempo completo')) return 'Full-time';
        if (text.includes('part-time') || text.includes('medio tiempo')) return 'Part-time';
        if (text.includes('contract') || text.includes('contrato')) return 'Contract';
      }
    }
    return '';
  }

  extractJobDescription(): string {
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobsearch-JobDescriptionText"]',
    ];
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
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
      '#salaryInfoAndJobType',
      '.jobsearch-JobMetadataHeader-item',
      '[data-testid="jobsearch-JobMetadataHeader-item"]',
      '.salary-snippet-container',
      '[class*="salary"]',
    ];
    for (const selector of salarySelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const text = element.textContent?.trim() || '';
        if (text.match(/[$€£]\s*[\d,]+/) ||
            text.toLowerCase().includes('salary') ||
            text.toLowerCase().includes('salario')) {
          return text;
        }
      }
    }
    return '';
  }

  extract(): JobData {
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

      // Extract posted date
      const dateSelectors = [
        '.jobsearch-JobMetadataHeader-item',
        '.jobsearch-HiringEvent-date',
        '.date',
        'footer .jobsearch-JobMetadataHeader-item',
      ];
      for (const selector of dateSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of Array.from(elements)) {
          const text = element.textContent || '';
          const postedMatch = text.match(/(\d+)\s+days?\s+ago/i) ||
                             text.match(/(\d+)\s+d[ií]as?\s+ago/i) ||
                             text.match(/hace\s+(\d+)\s+d[ií]as?/i) ||
                             text.match(/(\d+)\s+weeks?\s+ago/i) ||
                             text.match(/hace\s+(\d+)\s+semanas?/i) ||
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
            return data;
          }
        }
      }

    } catch (error) {
      console.error('Error extracting job data from Indeed:', error);
    }

    return data;
  }
}
