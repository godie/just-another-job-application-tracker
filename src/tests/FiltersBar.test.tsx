import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import FiltersBar from '../components/FiltersBar';
import { type Filters } from '../types/filters';

const defaultFilters: Filters = {
  search: '',
  status: '',
  statusInclude: [],
  statusExclude: [],
  platform: '',
  dateFrom: '',
  dateTo: '',
};

describe('FiltersBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('calls onFiltersChange when search input changes', () => {
    const handleFiltersChange = vi.fn();
    render(
      <FiltersBar
        filters={defaultFilters}
        onFiltersChange={handleFiltersChange}
        availableStatuses={['Applied']}
        availablePlatforms={['LinkedIn']}
        onClear={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Search/i), { target: { value: 'frontend' } });
    expect(handleFiltersChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(handleFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, search: 'frontend' });
  });

  test('calls onClear when clear button clicked', () => {
    const handleClear = vi.fn();
    render(
      <FiltersBar
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        availableStatuses={[]}
        availablePlatforms={[]}
        onClear={handleClear}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});

