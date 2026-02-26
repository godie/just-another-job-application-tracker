// chrome-extension/__tests__/GreenhouseJobExtractor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GreenhouseJobExtractor } from '../job-extractors/GreenhouseJobExtractor';

const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockQuerySelector.mockReturnValue(null);
  mockQuerySelectorAll.mockReturnValue([]);
  
  // Clear window.__remixContext
  Object.defineProperty(global, 'window', { value: { __remixContext: undefined }, writable: true });
  
  global.document = {
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
  } as unknown as Document;
});

describe('GreenhouseJobExtractor', () => {
  const extractor = new GreenhouseJobExtractor();

  describe('canHandle', () => {
    it('should return true for Greenhouse boards URLs', () => {
      expect(extractor.canHandle('https://boards.greenhouse.io/company/jobs/123')).toBe(true);
      expect(extractor.canHandle('https://job-boards.greenhouse.io/company/jobs/123')).toBe(true);
      expect(extractor.canHandle('https://greenhouse.io/jobs/123')).toBe(true);
    });

    it('should return false for non-Greenhouse URLs', () => {
      expect(extractor.canHandle('https://example.com')).toBe(false);
      expect(extractor.canHandle('https://www.linkedin.com/jobs/view/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract position from DOM', () => {
      const mockElement = { textContent: 'Senior Software Engineer', tagName: 'H1' };
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__title h1') return mockElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.position).toBe('Senior Software Engineer');
    });

    it('should extract company name from React state', () => {
      const mockRemixContext = {
        state: {
          loaderData: {
            'routes/$url_token_.jobs_.$job_post_id': {
              jobPost: {
                company_name: 'Narvar',
              },
            },
          },
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __remixContext: mockRemixContext }, writable: true });
      
      mockQuerySelector.mockReturnValue(null);
      
      const result = extractor.extract();
      expect(result.company).toBe('Narvar');
    });

    it('should extract company name from meta tag if React state not available', () => {
      const mockMetaElement = { content: 'Test Company', tagName: 'META' } as unknown as HTMLMetaElement;
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === 'meta[property="og:site_name"]') return mockMetaElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.company).toBe('Test Company');
    });

    it('should extract location and job type from location element', () => {
      const mockLocationElement = {
        textContent: 'Remote - Canada',
        tagName: 'DIV'
      };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__location div') return mockLocationElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.location).toBe('Remote');
      expect(result.jobType).toBe('Remote');
    });

    it('should detect Hybrid job type', () => {
      const mockLocationElement = {
        textContent: 'Hybrid - New York, NY',
        tagName: 'DIV'
      };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__location div') return mockLocationElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.jobType).toBe('Hybrid');
    });

    it('should extract description and limit to 1000 characters', () => {
      const longDescription = 'A'.repeat(1500);
      const mockDescriptionElement = { textContent: longDescription, tagName: 'DIV' };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__description') return mockDescriptionElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.description?.length).toBeLessThanOrEqual(1003);
      expect(result.description).toContain('...');
    });

    it('should extract salary from pay ranges section', () => {
      const mockSalaryElement = { textContent: '$180,000 - $230,000 CAD', tagName: 'DIV' };
      
      mockQuerySelectorAll.mockImplementation((selector) => {
        if (selector === '.job__pay-ranges .body') return [mockSalaryElement];
        return [];
      });
      
      const result = extractor.extract();
      expect(result.salary).toBe('$180,000 - $230,000 CAD');
    });

    it('should extract salary from description if not in dedicated section', () => {
      const mockDescriptionElement = { textContent: 'The compensation for this role is $150k - $200k per year.' + 'A'.repeat(100), tagName: 'DIV' };

      mockQuerySelectorAll.mockReturnValue([]); // No salary in dedicated section
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__description') return mockDescriptionElement;
        return null;
      });

      const result = extractor.extract();
      expect(result.salary).toContain('$150k');
    });

    it('should extract company name from logo alt text (v2)', () => {
      const mockLogoElement = {
        alt: 'Acme Corp Logo',
        tagName: 'IMG'
      } as unknown as HTMLImageElement;

      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.logo img') return mockLogoElement;
        return null;
      });

      const result = extractor.extractCompanyName();
      expect(result).toBe('Acme Corp');
    });

    it('should extract posted date from React state', () => {
      const mockRemixContext = {
        state: {
          loaderData: {
            'routes/$url_token_.jobs_.$job_post_id': {
              jobPost: {
                published_at: '2025-01-15T19:34:31-04:00',
              },
            },
          },
        },
      };
      
      Object.defineProperty(global, 'window', { value: { __remixContext: mockRemixContext }, writable: true });
      
      mockQuerySelector.mockReturnValue(null);
      
      const result = extractor.extract();
      expect(result.postedDate).toBeDefined();
      expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.postedDate).toBe('2025-01-15');
    });

    it('should handle missing DOM elements gracefully', () => {
      mockQuerySelector.mockReturnValue(null);
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      expect(result.position).toBeUndefined();
      expect(result.company).toBeUndefined();
    });

    it('should handle errors gracefully', () => {
      mockQuerySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should extract company name from logo alt text', () => {
      const mockLogoElement = {
        alt: 'Narvar Logo',
        tagName: 'IMG'
      } as unknown as HTMLImageElement;
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.logo img') return mockLogoElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.company).toBe('Narvar');
    });

    it('should extract full location text including country', () => {
      const mockLocationElement = {
        textContent: 'Remote - Canada',
        tagName: 'DIV'
      };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job__location div') return mockLocationElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.location).toBe('Remote');
    });
  });
});
