import { describe, it, expect } from 'vitest';
import { exportToCSV, parseCSV } from './csv';
import { JobApplication } from '../types/applications';

describe('CSV Utility', () => {
  const mockApplications: JobApplication[] = [
    {
      id: '1',
      position: 'Developer',
      company: 'Tech Corp',
      salary: '100k',
      status: 'Applied',
      applicationDate: '2023-01-01',
      interviewDate: '',
      timeline: [],
      notes: 'Some notes with "quotes"',
      link: 'http://example.com',
      platform: 'LinkedIn',
      contactName: 'John Doe',
      followUpDate: '2023-01-15'
    }
  ];

  it('should export applications to CSV', () => {
    const csv = exportToCSV(mockApplications);
    expect(csv).toContain('"Developer"');
    expect(csv).toContain('"Tech Corp"');
    expect(csv).toContain('"Some notes with ""quotes"""');
  });

  it('should parse CSV back to applications', () => {
    const csv = exportToCSV(mockApplications);
    const parsed = parseCSV(csv);
    expect(parsed.length).toBe(1);
    expect(parsed[0].position).toBe('Developer');
    expect(parsed[0].company).toBe('Tech Corp');
    expect(parsed[0].notes).toBe('Some notes with "quotes"');
  });
});
