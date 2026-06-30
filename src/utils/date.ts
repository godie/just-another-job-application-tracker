import type { DateFormat } from '../types/preferences';

export const parseLocalDate = (dateString: string | null | undefined): Date => {
  if (!dateString) return new Date();
  
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  return new Date(dateString);
};

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

