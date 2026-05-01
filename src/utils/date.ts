// src/utils/date.ts
import type { DateFormat } from '../types/preferences';

/**
 * Parse a date string in YYYY-MM-DD format as a local date (not UTC)
 * This prevents timezone issues where dates are shifted by one day
 * @param dateString - ISO date string (YYYY-MM-DD), or null/undefined for current date
 * @returns Date object in local timezone
 */
export const parseLocalDate = (dateString: string | null | undefined): Date => {
  if (!dateString) return new Date();
  
  // If the string is in YYYY-MM-DD format, parse it as local date
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    // month is 0-indexed in Date constructor
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Fallback to standard Date parsing for other formats
  return new Date(dateString);
};

/**
 * Format a date string according to user's date format preference
 * @param dateString - ISO date string (YYYY-MM-DD), any date string, or null/undefined
 * @param format - Date format preference
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | null | undefined, format: DateFormat = 'YYYY-MM-DD'): string => {
  if (!dateString) return '';
  
  try {
    const date = parseLocalDate(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
      default:
        return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

