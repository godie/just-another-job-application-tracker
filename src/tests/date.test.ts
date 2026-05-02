/**
 * @vitest-environment node
 */
import { describe, expect, test } from 'vitest';
import { parseLocalDate, formatDate } from '../utils/date';

describe('parseLocalDate', () => {
  test('should parse YYYY-MM-DD format as local date', () => {
    const dateString = '2025-12-11';
    const date = parseLocalDate(dateString);
    
    // Should be the same day regardless of timezone
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December is month 11 (0-indexed)
    expect(date.getDate()).toBe(11);
  });

  test('should handle dates correctly to avoid timezone shift', () => {
    // This is the specific case from the bug report
    const dateString = '2025-12-11';
    const date = parseLocalDate(dateString);
    
    // The date should be exactly December 11, 2025 at midnight local time
    const expectedDate = new Date(2025, 11, 11); // December 11, 2025 (local)
    
    expect(date.getFullYear()).toBe(expectedDate.getFullYear());
    expect(date.getMonth()).toBe(expectedDate.getMonth());
    expect(date.getDate()).toBe(expectedDate.getDate());
  });

  test('should return current date for empty string', () => {
    const date = parseLocalDate('');
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  test('should return current date for null/undefined-like values', () => {
    const date1 = parseLocalDate(null);
    const date2 = parseLocalDate(undefined);
    
    expect(date1).toBeInstanceOf(Date);
    expect(date2).toBeInstanceOf(Date);
  });

  test('should fallback to standard Date parsing for non-YYYY-MM-DD formats', () => {
    const dateString = '12/11/2025';
    const date = parseLocalDate(dateString);
    
    // Should still return a valid date
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
  });

  test('should handle ISO datetime strings', () => {
    const dateString = '2025-12-11T10:30:00Z';
    const date = parseLocalDate(dateString);
    
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
  });

  test('should parse different dates correctly', () => {
    const testCases = [
      { input: '2025-01-01', expectedYear: 2025, expectedMonth: 0, expectedDay: 1 },
      { input: '2025-06-15', expectedYear: 2025, expectedMonth: 5, expectedDay: 15 },
      { input: '2025-12-31', expectedYear: 2025, expectedMonth: 11, expectedDay: 31 },
      { input: '2024-02-29', expectedYear: 2024, expectedMonth: 1, expectedDay: 29 }, // Leap year
    ];

    testCases.forEach(({ input, expectedYear, expectedMonth, expectedDay }) => {
      const date = parseLocalDate(input);
      expect(date.getFullYear()).toBe(expectedYear);
      expect(date.getMonth()).toBe(expectedMonth);
      expect(date.getDate()).toBe(expectedDay);
    });
  });

  test('should not shift dates due to timezone when comparing', () => {
    // Create a date using parseLocalDate
    const date1 = parseLocalDate('2025-12-11');
    
    // The dates should have the same day when using getDate()
    // But date2 might be shifted due to timezone
    // parseLocalDate should preserve the day correctly
    expect(date1.getDate()).toBe(11);
    
    // date2 might be 10 or 11 depending on timezone, but date1 should always be 11
    // This is the key fix for the timezone bug
    expect(date1.getFullYear()).toBe(2025);
    expect(date1.getMonth()).toBe(11);
  });
});

describe('formatDate', () => {
  test('should format date in YYYY-MM-DD format by default', () => {
    const result = formatDate('2025-12-11');
    expect(result).toBe('2025-12-11');
  });

  test('should format date in DD/MM/YYYY format', () => {
    const result = formatDate('2025-12-11', 'DD/MM/YYYY');
    expect(result).toBe('11/12/2025');
  });

  test('should format date in MM/DD/YYYY format', () => {
    const result = formatDate('2025-12-11', 'MM/DD/YYYY');
    expect(result).toBe('12/11/2025');
  });

  test('should handle empty string', () => {
    const result = formatDate('');
    expect(result).toBe('');
  });

  test('should return original string for invalid date', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('invalid-date');
  });

  test('should use parseLocalDate internally to avoid timezone issues', () => {
    // This test ensures formatDate uses parseLocalDate, so it won't have timezone issues
    const dateString = '2025-12-11';
    const formatted = formatDate(dateString, 'DD/MM/YYYY');
    
    // Should format correctly without timezone shift
    expect(formatted).toBe('11/12/2025');
  });

  test('should handle single digit months and days', () => {
    const result1 = formatDate('2025-01-05', 'DD/MM/YYYY');
    const result2 = formatDate('2025-12-01', 'MM/DD/YYYY');
    
    expect(result1).toBe('05/01/2025');
    expect(result2).toBe('12/01/2025');
  });
});

