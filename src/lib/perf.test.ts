import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Metric } from 'web-vitals';

const onLCP = vi.fn();
const onINP = vi.fn();
const onCLS = vi.fn();
const onFCP = vi.fn();

vi.mock('web-vitals', () => ({
  onLCP,
  onINP,
  onCLS,
  onFCP,
}));

describe('web-vitals perf bridge', () => {
  beforeEach(() => {
    onLCP.mockClear();
    onINP.mockClear();
    onCLS.mockClear();
    onFCP.mockClear();
    // Reset module cache so the module-level `registered` flag is fresh
    // for each test. This isolates the "double registration guard" test
    // from prior registrations.
    vi.resetModules();
  });

  it('registers LCP, INP, CLS, FCP for reporting', async () => {
    const { startProductionVitalsLogging } = await import('./perf');
    startProductionVitalsLogging();
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onINP).toHaveBeenCalledTimes(1);
    expect(onCLS).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
  });

  it('guards against double-registration on StrictMode / hot-reload', async () => {
    const { startProductionVitalsLogging } = await import('./perf');
    startProductionVitalsLogging();
    startProductionVitalsLogging();
    // Second call short-circuits via the `registered` flag — observers get
    // exactly one handler each.
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onINP).toHaveBeenCalledTimes(1);
    expect(onCLS).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
  });

  it('dispatches a metric to every registered reporter in order', async () => {
    const additionalReporter = vi.fn();
    const { reporters, reportVital } = await import('./perf');
    const beforeLength = reporters.length;
    reporters.push(additionalReporter);

    try {
      const fakeMetric: Metric = {
        name: 'CLS',
        value: 0.05,
        id: 'v1',
        navigationType: 'navigate',
      };
      reportVital(fakeMetric);
      expect(additionalReporter).toHaveBeenCalledTimes(1);
      expect(additionalReporter).toHaveBeenCalledWith(fakeMetric);
    } finally {
      // Restore default reporter list so subsequent tests see the original.
      reporters.length = beforeLength;
    }
  });
});
