import type { JobApplication } from '../types/applications';
import { generateId } from './id';

/**
 * Exports an array of JobApplication to a CSV string.
 */
export const exportToCSV = (applications: JobApplication[]): string => {
  if (applications.length === 0) return '';

  const columns: (keyof JobApplication)[] = [
    'id', 'position', 'company', 'location', 'workType',
    'hybridDaysInOffice', 'salary', 'status', 'applicationDate',
    'interviewDate', 'notes', 'link', 'platform', 'contactName', 'followUpDate'
  ];

  const headers = [...columns, 'timeline', 'customFields'];

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const app of applications) {
    const values = headers.map(header => {
      const val = app[header as keyof JobApplication];
      let stringValue = '';

      if (val === undefined || val === null) {
        stringValue = '';
      } else if (typeof val === 'object') {
        stringValue = JSON.stringify(val);
      } else {
        stringValue = String(val);
      }

      // Escape double quotes and wrap in double quotes
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Parses a CSV string into an array of JobApplication.
 */
export const parseCSV = (csvText: string): JobApplication[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const applications: JobApplication[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const app: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';

      if (header === 'timeline' || header === 'customFields') {
        try {
          app[header] = value ? JSON.parse(value) : (header === 'timeline' ? [] : {});
        } catch {
          app[header] = header === 'timeline' ? [] : {};
        }
      } else if (header === 'hybridDaysInOffice') {
        app[header] = value ? parseInt(value, 10) : undefined;
      } else {
        app[header] = value;
      }
    });

    // Ensure it has an ID
    if (!app.id) {
      app.id = generateId();
    }

    // Validate required fields at least exist
    if (app.position && app.company) {
      applications.push(app as unknown as JobApplication);
    }
  }

  return applications;
};
