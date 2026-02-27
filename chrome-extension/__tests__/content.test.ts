// chrome-extension/__tests__/content.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chrome } from '../__mocks__/chrome';

// Mock chrome globally BEFORE importing content
 
(global as any).chrome = chrome;

// Now import after chrome is mocked
import { extractJobData, syncToWebApp } from '../content';

// Mock DOM APIs
const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn();

// Setup DOM mocks
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
  
  // Default mock behavior: return null (not found)
  mockQuerySelector.mockReturnValue(null);
  mockQuerySelectorAll.mockReturnValue([]);
  
  // Mock document.querySelector
  global.document = {
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
  } as unknown as Document;
  
  // Mock window.postMessage
  global.window = {
    postMessage: vi.fn(),
  } as unknown as Window & typeof globalThis;
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };
  global.localStorage = localStorageMock as unknown as Storage;
  
  // Mock location
  global.location = {
    href: 'https://www.linkedin.com/jobs/view/123',
  } as Location;
  
  // Mock window with location
  global.window = {
    ...global.window,
    location: global.location,
    postMessage: vi.fn(),
  } as unknown as Window & typeof globalThis;
  
  // Mock MutationObserver
  global.MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof MutationObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Content Script - extractJobData', () => {
  it('should extract position from DOM', () => {
    const mockElement = {
      textContent: 'Software Engineer',
    };
    
    // Mock all selectors - first one (position) should return element
    mockQuerySelector.mockReturnValueOnce(mockElement);
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result.position).toBe('Software Engineer');
  });
  
  it('should extract company name from DOM', () => {
    const mockCompanyElement = {
      textContent: 'Google',
    };
    
    // Mock all position selectors (4 attempts) to return null
    // Then mock first company selector to return element
    mockQuerySelector
      .mockReturnValueOnce(null) // position selector 1
      .mockReturnValueOnce(null) // position selector 2
      .mockReturnValueOnce(null) // position selector 3
      .mockReturnValueOnce(null) // position selector 4
      .mockReturnValueOnce(mockCompanyElement); // company selector 1 (found!)
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result.company).toBe('Google');
  });
  
  it('should extract location and job type', () => {
    const mockLocationElement = {
      textContent: 'San Francisco, CA · Remote · Posted 2 days ago',
    };
    
    // Mock position (4), company (4), then location (4 for extractLocation) and jobType (4 for extractJobType)
    mockQuerySelector
      .mockReturnValueOnce(null) // position 1
      .mockReturnValueOnce(null) // position 2
      .mockReturnValueOnce(null) // position 3
      .mockReturnValueOnce(null) // position 4
      .mockReturnValueOnce(null) // company 1
      .mockReturnValueOnce(null) // company 2
      .mockReturnValueOnce(null) // company 3
      .mockReturnValueOnce(null) // company 4
      .mockReturnValueOnce(null) // location selector 1
      .mockReturnValueOnce(null) // location selector 2
      .mockReturnValueOnce(null) // location selector 3
      .mockReturnValueOnce(mockLocationElement) // location selector 4 (found!)
      .mockReturnValueOnce(null) // jobType selector 1
      .mockReturnValueOnce(null) // jobType selector 2
      .mockReturnValueOnce(null) // jobType selector 3
      .mockReturnValueOnce(mockLocationElement); // jobType selector 4 (found!)
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result.location).toBe('San Francisco, CA');
    expect(result.jobType).toBe('Remote');
  });
  
  it('should extract description and limit to 1000 characters', () => {
    const longDescription = 'A'.repeat(1500);
    const mockDescriptionElement = {
      textContent: longDescription,
    };
    
    // Mock position (4), company (4), location (4), jobType (4), then description (4)
    mockQuerySelector
      .mockReturnValueOnce(null) // position 1
      .mockReturnValueOnce(null) // position 2
      .mockReturnValueOnce(null) // position 3
      .mockReturnValueOnce(null) // position 4
      .mockReturnValueOnce(null) // company 1
      .mockReturnValueOnce(null) // company 2
      .mockReturnValueOnce(null) // company 3
      .mockReturnValueOnce(null) // company 4
      .mockReturnValueOnce(null) // location 1
      .mockReturnValueOnce(null) // location 2
      .mockReturnValueOnce(null) // location 3
      .mockReturnValueOnce(null) // location 4
      .mockReturnValueOnce(null) // jobType 1
      .mockReturnValueOnce(null) // jobType 2
      .mockReturnValueOnce(null) // jobType 3
      .mockReturnValueOnce(null) // jobType 4
      .mockReturnValueOnce(null) // description 1
      .mockReturnValueOnce(null) // description 2
      .mockReturnValueOnce(null) // description 3
      .mockReturnValueOnce(mockDescriptionElement); // description 4 (found!)
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result.description?.length).toBeLessThanOrEqual(1003); // 1000 + '...'
    expect(result.description).toContain('...');
  });
  
  it('should extract posted date from "Posted X days ago" format', () => {
    // Mock multiple selectors - location selector returns element with date
    const mockLocationElement = {
      textContent: 'San Francisco, CA · Remote',
    };
    const mockDateElement = {
      textContent: 'Posted 5 days ago',
    };
    
    // Mock all selectors: position (4), company (7), location (4), jobType (4), description (4), date (5)
    // Note: salary uses querySelectorAll, so it doesn't count for querySelector mocks
    mockQuerySelector
      .mockReturnValueOnce(null) // position selector 1
      .mockReturnValueOnce(null) // position selector 2
      .mockReturnValueOnce(null) // position selector 3
      .mockReturnValueOnce(null) // position selector 4
      .mockReturnValueOnce(null) // company selector 1
      .mockReturnValueOnce(null) // company selector 2
      .mockReturnValueOnce(null) // company selector 3
      .mockReturnValueOnce(null) // company selector 4
      .mockReturnValueOnce(null) // company selector 5
      .mockReturnValueOnce(null) // company selector 6
      .mockReturnValueOnce(null) // company selector 7
      .mockReturnValueOnce(null) // location selector 1
      .mockReturnValueOnce(null) // location selector 2
      .mockReturnValueOnce(null) // location selector 3
      .mockReturnValueOnce(mockLocationElement) // location selector 4 (found!)
      .mockReturnValueOnce(null) // jobType selector 1
      .mockReturnValueOnce(null) // jobType selector 2
      .mockReturnValueOnce(null) // jobType selector 3
      .mockReturnValueOnce(null) // jobType selector 4
      .mockReturnValueOnce(null) // description selector 1
      .mockReturnValueOnce(null) // description selector 2
      .mockReturnValueOnce(null) // description selector 3
      .mockReturnValueOnce(null) // description selector 4
      .mockReturnValueOnce(null) // date selector 1
      .mockReturnValueOnce(null) // date selector 2
      .mockReturnValueOnce(null) // date selector 3
      .mockReturnValueOnce(null) // date selector 4
      .mockReturnValueOnce(mockDateElement); // date selector 5 (found!)
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result.postedDate).toBeDefined();
    // Should be a date string in YYYY-MM-DD format
    expect(result.postedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  
  it('should handle missing DOM elements gracefully', () => {
    mockQuerySelector.mockReturnValue(null);
    
    const result = extractJobData('https://www.linkedin.com/jobs/view/123');
    expect(result).toBeDefined();
    // Should return empty object or object with undefined values
    expect(result).toEqual({});
  });
  
  it('should return empty object for non-job-board URLs', () => {
    const result = extractJobData('https://example.com');
    expect(result).toEqual({});
  });
});

describe('Content Script - syncToWebApp', () => {
  it('should send postMessage with opportunity data', () => {
    const opportunity = {
      id: 'test-id',
      position: 'Software Engineer',
      company: 'Google',
      link: 'https://linkedin.com/jobs/view/123',
      capturedDate: new Date().toISOString(),
    };
    
    // Mock localStorage
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('[]');
    
    syncToWebApp(opportunity);
    
    expect(global.window.postMessage).toHaveBeenCalledWith(
      {
        type: 'JOB_OPPORTUNITY_SYNC',
        data: opportunity,
      },
      '*'
    );
  });
  
  it('should save to localStorage', () => {
    const opportunity = {
      id: 'test-id',
      position: 'Software Engineer',
      company: 'Google',
      link: 'https://linkedin.com/jobs/view/123',
      capturedDate: new Date().toISOString(),
    };
    
    // Mock localStorage with existing data
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('[]');
    
    syncToWebApp(opportunity);
    
    expect(global.localStorage.setItem).toHaveBeenCalled();
    const setItemCall = (global.localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(setItemCall[0]).toBe('jobOpportunities');
    const savedData = JSON.parse(setItemCall[1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0]).toMatchObject(opportunity);
  });
  
  it('should append to existing opportunities in localStorage', () => {
    const existingOpportunity = {
      id: 'existing-id',
      position: 'Existing Position',
      company: 'Existing Company',
      link: 'https://linkedin.com/jobs/view/456',
      capturedDate: new Date().toISOString(),
    };
    
    const newOpportunity = {
      id: 'new-id',
      position: 'New Position',
      company: 'New Company',
      link: 'https://linkedin.com/jobs/view/789',
      capturedDate: new Date().toISOString(),
    };
    
    // Mock localStorage with existing data
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify([existingOpportunity])
    );
    
    syncToWebApp(newOpportunity);
    
    const setItemCall = (global.localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedData = JSON.parse(setItemCall[1]);
    expect(savedData).toHaveLength(2);
    expect(savedData[0]).toMatchObject(existingOpportunity);
    expect(savedData[1]).toMatchObject(newOpportunity);
  });
  
  it('should handle localStorage errors gracefully', () => {
    const opportunity = {
      id: 'test-id',
      position: 'Software Engineer',
      company: 'Google',
      link: 'https://linkedin.com/jobs/view/123',
      capturedDate: new Date().toISOString(),
    };
    
    // Mock localStorage to throw error
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Storage error');
    });
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Should not throw
    expect(() => {
      syncToWebApp(opportunity);
    }).not.toThrow();
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});

describe('Content Script - Message Handler', () => {
  it('should handle getJobData action', () => {
    const request = { action: 'getJobData' };
    const sendResponse = vi.fn();
    
    // Mock position selector to return element
    mockQuerySelector.mockReturnValueOnce({ textContent: 'Test Position' });
    
    if ((global as any).chromeMessageListener) {
      const result = (global as any).chromeMessageListener(request, {}, sendResponse);
      expect(result).toBe(true); // Should return true to keep channel open
      expect(sendResponse).toHaveBeenCalled();
    }
  });
  
  it('should handle syncOpportunity action', () => {
    const opportunity = {
      id: 'test-id',
      position: 'Software Engineer',
      company: 'Google',
      link: 'https://linkedin.com/jobs/view/123',
      capturedDate: new Date().toISOString(),
    };
    
    const request = {
      action: 'syncOpportunity',
      data: opportunity,
    };
    const sendResponse = vi.fn();
    
    (global.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('[]');
    
    if ((global as any).chromeMessageListener) {
      const result = (global as any).chromeMessageListener(request, {}, sendResponse);
      expect(result).toBe(true);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    }
  });
  
  it('should return true to keep message channel open', () => {
    const request = { action: 'getJobData' };
    const sendResponse = vi.fn();
    
    // Mock querySelector to avoid errors
    mockQuerySelector.mockReturnValue(null);
    
    if ((global as any).chromeMessageListener) {
      const result = (global as any).chromeMessageListener(request, {}, sendResponse);
      expect(result).toBe(true);
    }
  });
});

