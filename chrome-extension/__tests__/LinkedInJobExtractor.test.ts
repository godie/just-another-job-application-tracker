// chrome-extension/__tests__/LinkedInJobExtractor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkedInJobExtractor } from '../job-extractors/LinkedInJobExtractor';

const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockQuerySelector.mockReturnValue(null);
  mockQuerySelectorAll.mockReturnValue([]);
  
  global.document = {
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
  } as unknown as Document;
});

describe('LinkedInJobExtractor', () => {
  const extractor = new LinkedInJobExtractor();

  describe('canHandle', () => {
    it('should return true for LinkedIn job view URLs', () => {
      expect(extractor.canHandle('https://www.linkedin.com/jobs/view/123')).toBe(true);
      expect(extractor.canHandle('https://www.linkedin.com/jobs/collections/123')).toBe(true);
    });

    it('should return false for non-LinkedIn URLs', () => {
      expect(extractor.canHandle('https://example.com')).toBe(false);
      expect(extractor.canHandle('https://greenhouse.io/jobs/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract position from DOM', () => {
      const mockElement = { textContent: 'Software Engineer', tagName: 'H1' };
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__job-title') return mockElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.position).toBe('Software Engineer');
    });

    it('should extract company name from DOM', () => {
      const mockCompanyElement = { textContent: 'Google', tagName: 'A' };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__company-name') return mockCompanyElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.company).toBe('Google');
    });

    it('should extract location and job type', () => {
      const mockLocationElement = {
        textContent: 'San Francisco, CA · Remote · Posted 2 days ago',
        tagName: 'DIV'
      };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__primary-description-without-tagline') return mockLocationElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.location).toBe('San Francisco, CA');
      expect(result.jobType).toBe('Remote');
    });

    it('should extract description and limit to 1000 characters', () => {
      const longDescription = 'A'.repeat(1500);
      const mockDescriptionElement = { textContent: longDescription, tagName: 'DIV' };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.jobs-description__text') return mockDescriptionElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.description?.length).toBeLessThanOrEqual(1003);
      expect(result.description).toContain('...');
    });

    it('should extract salary when available', () => {
      const mockSalaryElement = { textContent: '$120,000 - $150,000', tagName: 'DIV' };
      const mockSalaryElements = [mockSalaryElement];
      
      mockQuerySelectorAll.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__job-insight') return mockSalaryElements;
        return [];
      });
      
      const result = extractor.extract();
      expect(result.salary).toBe('$120,000 - $150,000');
    });

    it('should extract salary from description if not in insights', () => {
      const mockDescriptionElement = { textContent: 'The salary is $80,000 - $90,000 per year.' + 'A'.repeat(100), tagName: 'DIV' };

      mockQuerySelectorAll.mockReturnValue([]); // No salary in insights
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.jobs-description__text') return mockDescriptionElement;
        return null;
      });

      const result = extractor.extract();
      expect(result.salary).toContain('$80,000');
    });

    it('should handle Spanish job types', () => {
      const mockLocationElement = {
        textContent: 'Madrid · En remoto',
        tagName: 'DIV'
      };

      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__primary-description-without-tagline') return mockLocationElement;
        return null;
      });

      const result = extractor.extract();
      expect(result.jobType).toBe('En remoto');
    });

    it('should extract posted date from "Posted X days ago" format', () => {
      const mockPrimaryDescriptionElement = {
        textContent: 'San Francisco, CA · Remote · Posted 5 days ago',
        tagName: 'DIV'
      };
      
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__primary-description-without-tagline') return mockPrimaryDescriptionElement;
        return null;
      });

      const result = extractor.extract();
      expect(result.postedDate).toBeDefined();
      expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract posted date from Spanish relative format (hace 3 semanas)', () => {
      const mockPrimaryDescriptionElement = {
        textContent: 'Barcelona · Híbrido · hace 3 semanas',
        tagName: 'DIV'
      };

      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.job-details-jobs-unified-top-card__primary-description-without-tagline') return mockPrimaryDescriptionElement;
        return null;
      });
      
      const result = extractor.extract();
      expect(result.postedDate).toBeDefined();
      expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle missing DOM elements gracefully', () => {
      mockQuerySelector.mockReset();
      mockQuerySelector.mockReturnValue(null);
      
      const result = extractor.extract();
      expect(result).toBeDefined();
      expect(result.position).toBeUndefined();
      expect(result.company).toBeUndefined();
      expect(result.postedDate).toBeUndefined();
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
  });
});
