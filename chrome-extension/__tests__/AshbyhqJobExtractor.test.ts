// chrome-extension/__tests__/AshbyhqJobExtractor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AshbyhqJobExtractor } from '../job-extractors/AshbyhqJobExtractor';

const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn();

describe('AshbyhqJobExtractor', () => {
  const extractor = new AshbyhqJobExtractor();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuerySelector.mockReturnValue(null);
    mockQuerySelectorAll.mockReturnValue([]);
    Object.defineProperty(global, 'window', { value: { __appData: undefined } });
    global.document = {
      querySelector: mockQuerySelector,
      querySelectorAll: mockQuerySelectorAll,
      createElement: vi.fn(() => ({
        textContent: '',
        innerHTML: '',
      })),
    } as unknown as Document;
    const ext = extractor as unknown as { _cachedJsonLd: unknown; _cachedAppData: unknown };
    ext._cachedJsonLd = undefined;
    ext._cachedAppData = undefined;
  });

  describe('canHandle', () => {
    it('should return true for AshbyHQ job URLs', () => {
      expect(extractor.canHandle('https://jobs.ashbyhq.com/company/job/123')).toBe(true);
      expect(extractor.canHandle('https://app.ashbyhq.com/jobs/123')).toBe(true);
      expect(extractor.canHandle('https://example.ashbyhq.com/jobs/123')).toBe(true);
    });

    it('should return false for non-AshbyHQ URLs', () => {
      expect(extractor.canHandle('https://example.com')).toBe(false);
      expect(extractor.canHandle('https://www.linkedin.com/jobs/view/123')).toBe(false);
      expect(extractor.canHandle('https://boards.greenhouse.io/company/jobs/123')).toBe(false);
    });
  });

  describe('extractJobTitle', () => {
    it('should extract title from window.__appData', () => {
      const mockAppData = {
        posting: {
          title: 'Senior Software Engineer',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobTitle();
      expect(result).toBe('Senior Software Engineer');
    });

    it('should extract title from JSON-LD when __appData not available', () => {
      const jsonLdContent = {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: 'Full Stack Developer',
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractJobTitle();
      expect(result).toBe('Full Stack Developer');
    });

    it('should extract title from title tag', () => {
      const mockTitleElement = { textContent: 'Senior Engineer @ Company Name' };
      // getJsonLd uses querySelectorAll; then og:title, then title
      mockQuerySelector
        .mockReturnValueOnce(null) // og:title
        .mockReturnValueOnce(mockTitleElement); // title
      const result = extractor.extractJobTitle();
      expect(result).toBe('Senior Engineer');
    });

    it('should extract title from og:title meta tag', () => {
      const mockMetaElement = { content: 'Software Engineer Position' } as HTMLMetaElement;
      mockQuerySelector.mockReturnValueOnce(mockMetaElement); // og:title
      const result = extractor.extractJobTitle();
      expect(result).toBe('Software Engineer Position');
    });
  });

  describe('extractCompanyName', () => {
    it('should extract company from window.__appData', () => {
      const mockAppData = {
        organization: {
          name: 'Pebl',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractCompanyName();
      expect(result).toBe('Pebl');
    });

    it('should extract company from JSON-LD', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        hiringOrganization: { name: 'Test Company' },
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractCompanyName();
      expect(result).toBe('Test Company');
    });

    it('should extract company from title tag format', () => {
      const mockTitleElement = { textContent: 'Software Engineer @ Google' };
      mockQuerySelector.mockReturnValueOnce(mockTitleElement); // title
      const result = extractor.extractCompanyName();
      expect(result).toBe('Google');
    });
  });

  describe('extractLocation', () => {
    it('should extract location from window.__appData', () => {
      const mockAppData = {
        posting: {
          locationName: 'Toronto, Ontario',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractLocation();
      expect(result).toBe('Toronto, Ontario');
    });

    it('should extract location from JSON-LD address', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        jobLocation: {
          address: {
            addressLocality: 'Toronto',
            addressRegion: 'Ontario',
            addressCountry: 'Canada',
          },
        },
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractLocation();
      expect(result).toBe('Toronto, Ontario, Canada');
    });

    it('should handle partial address in JSON-LD', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        jobLocation: { address: { addressLocality: 'San Francisco' } },
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractLocation();
      expect(result).toBe('San Francisco');
    });
  });

  describe('extractJobType', () => {
    it('should detect Remote from workplaceType', () => {
      const mockAppData = {
        posting: {
          workplaceType: 'Remote',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      const result = extractor.extractJobType();
      expect(result).toBe('Remote');
    });

    it('should detect Hybrid from workplaceType', () => {
      const mockAppData = {
        posting: {
          workplaceType: 'Hybrid',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobType();
      expect(result).toBe('Hybrid');
    });

    it('should detect Remote from isRemote flag', () => {
      const mockAppData = {
        posting: {
          isRemote: true,
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobType();
      expect(result).toBe('Remote');
    });

    it('should detect Remote from JSON-LD jobLocationType', () => {
      const jsonLdContent = { '@type': 'JobPosting', jobLocationType: 'TELECOMMUTE' };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractJobType();
      expect(result).toBe('Remote');
    });

    it('should convert OnSite to On-site', () => {
      const mockAppData = {
        posting: {
          workplaceType: 'OnSite',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobType();
      expect(result).toBe('On-site');
    });
  });

  describe('extractJobDescription', () => {
    it('should extract description from window.__appData.descriptionPlainText', () => {
      const longDescription = 'A'.repeat(1500);
      const mockAppData = {
        posting: {
          descriptionPlainText: longDescription,
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobDescription();
      expect(result.length).toBeLessThanOrEqual(1003);
      expect(result).toContain('...');
    });

    it('should extract description from window.__appData.descriptionHtml', () => {
      const mockAppData = {
        posting: {
          descriptionHtml: '<p>Job description with <strong>HTML</strong> content. This is a comprehensive job description that includes all the necessary details about the position, requirements, and responsibilities. It needs to be at least 100 characters long to be extracted by the extractor.</p>',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      // Mock createElement to return an object that simulates DOM element behavior
      (global.document.createElement as unknown) = vi.fn(() => {
        const div: { _innerHTML: string; _textContent: string } = {
          _innerHTML: '',
          _textContent: '',
        };
        Object.defineProperty(div, 'innerHTML', {
          set(value: string) {
            div._innerHTML = value;
            // Extract text from HTML by removing tags
            div._textContent = value.replace(/<[^>]*>/g, '').trim();
          },
          get() {
            return div._innerHTML || '';
          },
        });
        Object.defineProperty(div, 'textContent', {
          get() {
            return div._textContent || '';
          },
        });
        return div;
      });
      
      const result = extractor.extractJobDescription();
      expect(result.length).toBeGreaterThan(100);
      expect(result).toContain('Job description with HTML content');
    });

    it('should extract description from JSON-LD', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        description: '<p>This is a job description. This is a comprehensive job description that includes all the necessary details about the position, requirements, and responsibilities. It needs to be at least 100 characters long to be extracted by the extractor.</p>',
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      (global.document.createElement as unknown) = vi.fn(() => {
        const div: { _innerHTML: string; _textContent: string } = {
          _innerHTML: '',
          _textContent: '',
        };
        Object.defineProperty(div, 'innerHTML', {
          set(value: string) {
            div._innerHTML = value;
            const textMatch = value.replace(/<[^>]*>/g, '').trim();
            div._textContent = textMatch;
          },
          get() {
            return div._innerHTML || '';
          },
        });
        Object.defineProperty(div, 'textContent', {
          get() {
            return div._textContent || '';
          },
        });
        return div;
      });
      const result = extractor.extractJobDescription();
      expect(result.length).toBeGreaterThan(100);
      expect(result).toContain('This is a job description');
    });

    it('should extract description from meta description tag', () => {
      const mockMetaElement = { content: 'A'.repeat(500) } as HTMLMetaElement;
      mockQuerySelector.mockReturnValueOnce(mockMetaElement); // meta[name="description"]
      const result = extractor.extractJobDescription();
      expect(result).toBe('A'.repeat(500));
    });

    it('should limit description to 1000 characters', () => {
      const longText = 'A'.repeat(2000);
      const mockAppData = {
        posting: {
          descriptionPlainText: longText,
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractJobDescription();
      expect(result.length).toBe(1003); // 1000 + '...'
      expect(result).toContain('...');
    });
  });

  describe('extractSalary', () => {
    it('should extract salary from compensationTierSummary', () => {
      const mockAppData = {
        posting: {
          compensationTierSummary: 'CA$175K – CA$200K • Offers Equity',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractSalary();
      expect(result).toBe('CA$175K – CA$200K • Offers Equity');
    });

    it('should extract salary from compensationTiers array', () => {
      const mockAppData = {
        posting: {
          compensationTiers: [
            {
              tierSummary: 'Annualized Pay Range CA$175K – CA$200K',
            },
          ],
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractSalary();
      expect(result).toBe('Annualized Pay Range CA$175K – CA$200K');
    });

    it('should extract salary from scrapeableCompensationSalarySummary', () => {
      const mockAppData = {
        posting: {
          scrapeableCompensationSalarySummary: 'CA$175K - CA$200K',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extractSalary();
      expect(result).toBe('CA$175K - CA$200K');
    });

    it('should extract salary from JSON-LD baseSalary', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        baseSalary: {
          currency: 'CAD',
          value: { minValue: 175000, maxValue: 200000, unitText: 'YEAR' },
        },
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractSalary();
      expect(result).toContain('CAD');
      expect(result).toContain('175,000');
      expect(result).toContain('200,000');
    });

    it('should handle salary with only minValue', () => {
      const jsonLdContent = {
        '@type': 'JobPosting',
        baseSalary: { currency: 'USD', value: { minValue: 120000, unitText: 'YEAR' } },
      };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extractSalary();
      expect(result).toContain('USD');
      expect(result).toContain('120,000');
    });
  });

  describe('extract', () => {
    it('should extract all fields from window.__appData', () => {
      const mockAppData = {
        organization: {
          name: 'Pebl',
        },
        posting: {
          title: 'Senior Fullstack Software Engineer A.I.',
          locationName: 'Toronto, Ontario',
          workplaceType: 'Hybrid',
          descriptionPlainText: 'Job description text that is long enough to be extracted. This is a comprehensive job description that includes all the necessary details about the position, requirements, and responsibilities. It needs to be at least 100 characters long to be extracted by the extractor.',
          compensationTierSummary: 'CA$175K – CA$200K',
          publishedDate: '2025-11-21',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extract();
      
      expect(result.position).toBe('Senior Fullstack Software Engineer A.I.');
      expect(result.company).toBe('Pebl');
      expect(result.location).toBe('Toronto, Ontario');
      expect(result.jobType).toBe('Hybrid');
      expect(result.description).toBeDefined();
      expect(result.description?.length).toBeGreaterThan(100);
      expect(result.salary).toBe('CA$175K – CA$200K');
      expect(result.postedDate).toBe('2025-11-21');
    });

    it('should extract posted date from window.__appData', () => {
      const mockAppData = {
        posting: {
          publishedDate: '2025-11-21',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extract();
      expect(result.postedDate).toBe('2025-11-21');
    });

    it('should extract posted date from JSON-LD when __appData not available', () => {
      const jsonLdContent = { '@type': 'JobPosting', datePosted: '2025-11-21' };
      const mockScriptElement = { textContent: JSON.stringify(jsonLdContent) };
      Object.defineProperty(global, 'window', { value: { __appData: { posting: {} } } });
      mockQuerySelectorAll.mockImplementation((selector: string) =>
        selector === 'script[type="application/ld+json"]' ? [mockScriptElement] : []
      );
      const result = extractor.extract();
      expect(result.postedDate).toBe('2025-11-21');
    });

    it('should handle missing window.__appData gracefully', () => {
      mockQuerySelector.mockReturnValue(null);
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      expect(result.position).toBeUndefined();
      expect(result.company).toBeUndefined();
    });

    it('should handle errors gracefully', () => {
      Object.defineProperty(global, 'window', { value: { __appData: null } });
      
      mockQuerySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON-LD parse errors gracefully', () => {
      const mockScriptElement = {
        textContent: 'invalid json {',
      };
      
      mockQuerySelector.mockReturnValue(mockScriptElement);
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      // Should not throw, should continue with other extraction methods
    });

    it('should handle date parsing errors gracefully', () => {
      const mockAppData = {
        posting: {
          publishedDate: 'invalid-date',
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __appData: mockAppData } });
      
      const result = extractor.extract();
      expect(result.postedDate).toBeUndefined();
    });
  });
});

