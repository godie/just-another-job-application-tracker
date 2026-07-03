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
  // Capture the original navigator.sendBeacon so each test can swap in a
  // mock and restore it. Without the restore, a later test in the same
  // file (or a sibling test file in the same vitest worker) silently
  // observes the spy and may falsely "pass" because the real beacon was
  // never exercised. The `afterEach` runs even when the assertion throws,
  // so we don't strand a spied navigator when an expectation fails.
  let originalSendBeacon: typeof navigator.sendBeacon | undefined;
  beforeEach(() => {
    onLCP.mockClear();
    onINP.mockClear();
    onCLS.mockClear();
    onFCP.mockClear();
    // Reset module cache so the module-level `registered` flag is fresh
    // for each test. This isolates the "double registration guard" test
    // from prior registrations.
    vi.resetModules();
    originalSendBeacon = Object.getOwnPropertyDescriptor(
      navigator,
      'sendBeacon',
    )?.value as typeof navigator.sendBeacon | undefined;
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: originalSendBeacon,
      writable: true,
      configurable: true,
    });
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

  it('posts web-vitals via sendBeacon with a blob of type application/json', async () => {
    // ModSecurity CRS rule 920420 (REQUEST-920-PROTOCOL-ENFORCEMENT)
    // rejects `text/plain` POSTs to /api/perf/vitals with
    // `[msg "Request content type is not allowed by policy"]`.
    // The fix is to wrap the JSON payload in a Blob typed
    // `application/json` — sendBeacon(url, string) always forces
    // text/plain, but sendBeacon(url, blob) honors the Blob's MIME. This
    // test pins that contract so a future refactor cannot silently
    // regress to a plain string and re-trigger the WAF warning.
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      value: sendBeaconMock,
      writable: true,
      configurable: true,
    });

    const { enableLogfireReporter, reportVital } = await import('./perf');
    enableLogfireReporter();
    sendBeaconMock.mockClear();

    const fakeMetric: Metric = {
      name: 'LCP',
      value: 1234.5,
      id: 'v1',
      navigationType: 'navigate',
    };
    reportVital(fakeMetric);

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, payload] = sendBeaconMock.mock.calls[0];
    expect(url).toMatch(/\/api\/perf\/vitals$/);
    expect(payload).toBeInstanceOf(Blob);
    expect((payload as Blob).type).toBe('application/json');

    const body = JSON.parse(await (payload as Blob).text());
    expect(body).toMatchObject({
      name: 'LCP',
      value: 1234.5,
      id: 'v1',
      navigationType: 'navigate',
    });
    expect(typeof body.timestamp).toBe('number');
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
