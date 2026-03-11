import { renderHook } from '@testing-library/react';
import { useTableColumns } from './useTableColumns';
import { type UserPreferences } from '../types/preferences';
import { DEFAULT_FIELDS } from '../utils/constants';
import { describe, it, expect, vi } from 'vitest';

const stableT = (key: string, fallback: string) => fallback || key;

// Mock react-i18next specifically for this test to ensure stable t function
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: { language: 'en' }
  })
}));

describe('useTableColumns', () => {
  it('should return default columns when preferences are null', () => {
    const { result } = renderHook(() => useTableColumns(null));

    expect(result.current.length).toBe(DEFAULT_FIELDS.length);
  });

  it('should filter enabled fields and follow column order', () => {
    const mockPreferences: UserPreferences = {
      enabledFields: ['position', 'company', 'status'],
      columnOrder: ['status', 'position', 'company'],
      customFields: [],
      defaultView: 'table',
      dateFormat: 'YYYY-MM-DD',
      customInterviewEvents: [],
    };

    const { result } = renderHook(() => useTableColumns(mockPreferences));

    expect(result.current.length).toBe(3);
    expect(result.current[0].id).toBe('status');
    expect(result.current[1].id).toBe('position');
    expect(result.current[2].id).toBe('company');
  });

  it('should include custom fields', () => {
    const mockPreferences: UserPreferences = {
      enabledFields: ['position', 'custom1'],
      columnOrder: ['position', 'custom1'],
      customFields: [
        { id: 'custom1', label: 'Custom Label', type: 'text', required: false }
      ],
      defaultView: 'table',
      dateFormat: 'YYYY-MM-DD',
      customInterviewEvents: [],
    };

    const { result } = renderHook(() => useTableColumns(mockPreferences));

    expect(result.current.length).toBe(2);
    expect(result.current[1].id).toBe('custom1');
    expect(result.current[1].label).toBe('Custom Label');
  });

  it('should maintain referential identity when preferences are unchanged', () => {
    const mockPreferences: UserPreferences = {
      enabledFields: ['position'],
      columnOrder: ['position'],
      customFields: [],
      defaultView: 'table',
      dateFormat: 'YYYY-MM-DD',
      customInterviewEvents: [],
    };

    const { result, rerender } = renderHook(
      ({ prefs }) => useTableColumns(prefs),
      {
        initialProps: { prefs: mockPreferences }
      }
    );

    const firstResult = result.current;

    // Test 1: New reference triggers recalculation
    rerender({ prefs: { ...mockPreferences } });
    const secondResult = result.current;
    expect(secondResult).not.toBe(firstResult);

    // Test 2: Same reference maintains identity
    const samePrefs = { ...mockPreferences };
    rerender({ prefs: samePrefs });
    const thirdResult = result.current;

    rerender({ prefs: samePrefs });
    const fourthResult = result.current;
    expect(fourthResult).toBe(thirdResult);
  });
});
