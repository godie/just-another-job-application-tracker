// src/utils/timelineDisplay.test.ts

import { describe, it, expect, vi } from 'vitest';
import { formatDate, getStageDisplayName, getEventStatusColor } from './timelineDisplay';

// ─── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a valid YYYY-MM-DD date string to locale format', () => {
    const result = formatDate('2025-06-15');
    // JSDOM default locale is en-US, so we expect "Jun 15, 2025"
    expect(result).toBe('Jun 15, 2025');
  });

  it('formats a date in January correctly', () => {
    expect(formatDate('2025-01-01')).toBe('Jan 1, 2025');
  });

  it('formats a date in December correctly', () => {
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
  });

  it('handles single-digit month and day', () => {
    expect(formatDate('2025-03-05')).toBe('Mar 5, 2025');
  });

  it('returns the input string unchanged when the date is unparseable', () => {
    // isNaN(d.getTime()) catches invalid dates before toLocaleDateString
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('returns the input unchanged for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns the input unchanged for bogus month/day', () => {
    expect(formatDate('2025-13-40')).toBe('2025-13-40');
  });
});

// ─── getStageDisplayName ──────────────────────────────────────────────────────

describe('getStageDisplayName', () => {
  const mockT = vi.fn((key: string, fallback?: string) => {
    // Simulate i18next behavior: return translation if it exists, else fallback
    const translations: Record<string, string> = {
      'insights.interviewTypes.application_submitted': 'Application Submitted',
      'insights.interviewTypes.technical_interview': 'Technical Interview',
      'insights.interviewTypes.first_contact': 'First Contact',
      'insights.interviewTypes.offer': 'Offer',
      'insights.interviewTypes.rejected': 'Rejected',
    };
    return translations[key] ?? fallback ?? key;
  });

  beforeEach(() => {
    mockT.mockClear();
  });

  it('returns translated name for a known event type', () => {
    expect(getStageDisplayName(mockT, 'application_submitted')).toBe('Application Submitted');
    expect(mockT).toHaveBeenCalledWith(
      'insights.interviewTypes.application_submitted',
      'application submitted'
    );
  });

  it('returns translated name for technical_interview', () => {
    expect(getStageDisplayName(mockT, 'technical_interview')).toBe('Technical Interview');
  });

  it('returns the fallback (underscore-to-space) for unknown event types', () => {
    expect(getStageDisplayName(mockT, 'some_custom_stage')).toBe('some custom stage');
    expect(mockT).toHaveBeenCalledWith(
      'insights.interviewTypes.some_custom_stage',
      'some custom stage'
    );
  });

  it('returns the customTypeName for type "custom" when provided', () => {
    expect(getStageDisplayName(mockT, 'custom', 'My Custom Stage')).toBe('My Custom Stage');
    // t() should NOT be called when type is 'custom' with a customTypeName
    expect(mockT).not.toHaveBeenCalled();
  });

  it('falls back to translated value for type "custom" when customTypeName is empty', () => {
    expect(getStageDisplayName(mockT, 'custom', '')).toBe('custom');
    expect(mockT).toHaveBeenCalledWith('insights.interviewTypes.custom', 'custom');
  });

  it('falls back to translated value for type "custom" when customTypeName is undefined', () => {
    expect(getStageDisplayName(mockT, 'custom')).toBe('custom');
    expect(mockT).toHaveBeenCalledWith('insights.interviewTypes.custom', 'custom');
  });

  it('handles type with no underscores (passes through as-is)', () => {
    expect(getStageDisplayName(mockT, 'screener')).toBe('screener');
    expect(mockT).toHaveBeenCalledWith('insights.interviewTypes.screener', 'screener');
  });

  it('converts underscores to spaces in the fallback', () => {
    expect(getStageDisplayName(mockT, 'live_coding')).toBe('live coding');
  });

  it('returns known translation for first_contact', () => {
    expect(getStageDisplayName(mockT, 'first_contact')).toBe('First Contact');
  });

  it('returns known translation for offer', () => {
    expect(getStageDisplayName(mockT, 'offer')).toBe('Offer');
  });

  it('returns known translation for rejected', () => {
    expect(getStageDisplayName(mockT, 'rejected')).toBe('Rejected');
  });
});

// ─── getEventStatusColor ───────────────────────────────────────────────────────

describe('getEventStatusColor', () => {
  it('returns green for completed status', () => {
    expect(getEventStatusColor('completed')).toBe('bg-green-500');
  });

  it('returns blue for scheduled status', () => {
    expect(getEventStatusColor('scheduled')).toBe('bg-blue-500');
  });

  it('returns gray for cancelled status', () => {
    expect(getEventStatusColor('cancelled')).toBe('bg-gray-400');
  });

  it('returns yellow for pending status', () => {
    expect(getEventStatusColor('pending')).toBe('bg-yellow-500');
  });

  it('returns gray fallback for unknown status', () => {
    expect(getEventStatusColor('nonexistent')).toBe('bg-gray-400');
  });

  it('returns gray fallback for empty string', () => {
    expect(getEventStatusColor('')).toBe('bg-gray-400');
  });

  it('is case-sensitive (returns fallback for uppercase variant)', () => {
    // The function does exact string matching; 'COMPLETED' is not a known key
    expect(getEventStatusColor('COMPLETED')).toBe('bg-gray-400');
  });
});
