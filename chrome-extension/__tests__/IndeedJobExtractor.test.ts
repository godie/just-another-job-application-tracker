// chrome-extension/__tests__/IndeedJobExtractor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndeedJobExtractor } from '../job-extractors/IndeedJobExtractor';

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

describe('IndeedJobExtractor', () => {
  const extractor = new IndeedJobExtractor();

  describe('canHandle', () => {
    it('should return true for Indeed job URLs', () => {
      expect(extractor.canHandle('https://www.indeed.com/viewjob?jk=123')).toBe(true);
      expect(extractor.canHandle('https://www.indeed.com/jobs?q=developer')).toBe(true);
    });

    it('should return false for non-Indeed URLs', () => {
      expect(extractor.canHandle('https://example.com')).toBe(false);
      expect(extractor.canHandle('https://www.linkedin.com/jobs/view/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract position from DOM', () => {
      const mockElement = { textContent: 'Full Stack Developer' };
      mockQuerySelector.mockReturnValueOnce(mockElement);

      const result = extractor.extract();
      expect(result.position).toBe('Full Stack Developer');
    });

    it('should extract company name from data-testid', () => {
      const mockCompanyElement = { textContent: 'Tech Corp' };

      mockQuerySelector
        .mockReturnValueOnce(null) // title 1
        .mockReturnValueOnce(null) // title 2
        .mockReturnValueOnce(null) // title 3
        .mockReturnValueOnce(null) // title 4
        .mockReturnValueOnce(mockCompanyElement); // company 1 (found!)

      const result = extractor.extract();
      expect(result.company).toBe('Tech Corp');
    });

    it('should extract company name from meta description', () => {
      const mockMetaElement = { content: 'Apply for Developer at Awesome Co in Madrid.' } as HTMLMetaElement;

      mockQuerySelector
        .mockReturnValueOnce(null) // titles
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null) // company 1
        .mockReturnValueOnce(null) // company 2
        .mockReturnValueOnce(null) // company 3
        .mockReturnValueOnce(null) // company 4
        .mockReturnValueOnce(mockMetaElement); // company 5 (meta)

      const result = extractor.extract();
      expect(result.company).toBe('Awesome Co');
    });

    it('should extract location', () => {
      const mockLocationElement = { textContent: 'Madrid, Spain' };

      mockQuerySelector.mockImplementation((selector: string) => {
        if (selector === '[data-testid="jobsearch-JobInfoHeader-companyLocation"]') {
          return mockLocationElement as unknown as HTMLElement;
        }
        return null;
      });

      const result = extractor.extract();
      expect(result.location).toBe('Madrid, Spain');
    });

    it('should extract job type (Remote)', () => {
      const mockJobTypeElement = { textContent: 'Remote' };
      mockQuerySelectorAll.mockReturnValueOnce([mockJobTypeElement]);

      const result = extractor.extract();
      expect(result.jobType).toBe('Remote');
    });

    it('should extract job type (Spanish: Remoto)', () => {
      const mockJobTypeElement = { textContent: 'Trabajo Remoto' };
      mockQuerySelectorAll.mockReturnValueOnce([mockJobTypeElement]);

      const result = extractor.extract();
      expect(result.jobType).toBe('Remote');
    });

    it('should extract salary', () => {
      const mockSalaryElement = { textContent: '$80,000 - $100,000 a year' };
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '#salaryInfoAndJobType') {
          return [mockSalaryElement] as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      });

      const result = extractor.extract();
      expect(result.salary).toBe('$80,000 - $100,000 a year');
    });

    it('should extract posted date (English: 5 days ago)', () => {
      const mockDateElement = { textContent: 'Posted 5 days ago' };
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.date') {
          return [mockDateElement] as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      });

      const result = extractor.extract();
      expect(result.postedDate).toBeDefined();
      expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract posted date (Spanish: hace 2 semanas)', () => {
      const mockDateElement = { textContent: 'hace 2 semanas' };
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.date') {
          return [mockDateElement] as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      });

      const result = extractor.extract();
      expect(result.postedDate).toBeDefined();
      expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
