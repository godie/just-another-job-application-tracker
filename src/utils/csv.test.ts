import { describe, it, expect } from 'vitest';
import { exportToCSV, parseCSV, parseCsvHeaders } from './csv';
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

  it('should read headers from the first row', () => {
    expect(parseCsvHeaders('"Job Title","Empresa"\n"Dev","Acme"')).toEqual(['Job Title', 'Empresa']);
  });

  it('should map foreign headers through an explicit field list', () => {
    const csv = '"Job Title","Empresa","Estado"\n"Senior Engineer","Acme","applied"';
    const parsed = parseCSV(csv, ['position', 'company', 'status']);

    expect(parsed.length).toBe(1);
    expect(parsed[0].position).toBe('Senior Engineer');
    expect(parsed[0].company).toBe('Acme');
    expect(parsed[0].status).toBe('applied');
  });

  it('should apply the injected work-type and date normalizers', () => {
    const csv = '"Position","Company","Work type","Applied on"\n"Dev","Acme","Remote (EU)","12 de marzo de 2026"';
    const parsed = parseCSV(csv, ['position', 'company', 'workType', 'applicationDate'], {
      workType: () => 'remote',
      date: () => '2026-03-12',
    });

    expect(parsed[0].workType).toBe('remote');
    expect(parsed[0].applicationDate).toBe('2026-03-12');
  });

  it('should fall back to the file value when a normalizer cannot read it', () => {
    const csv = '"Position","Company","Applied on"\n"Dev","Acme","not a date"';
    const parsed = parseCSV(csv, ['position', 'company', 'applicationDate'], {
      date: () => undefined,
    });

    expect(parsed[0].applicationDate).toBe('not a date');
  });

  it('should skip columns mapped to null', () => {
    const csv = '"Position","Company","Internal Id"\n"Dev","Acme","xyz"';
    const parsed = parseCSV(csv, ['position', 'company', null]);

    expect(parsed[0].position).toBe('Dev');
    expect(parsed[0]).not.toHaveProperty('Internal Id');
  });
});
