import { onLCP, onINP, onCLS, onFCP, type Metric } from 'web-vitals';

export type Reporter = (metric: Metric) => void;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Send web-vitals metrics to the backend as span events.
 * The backend attaches them to the current trace so they appear in Logfire.
 */
const logfireReporter: Reporter = (metric) => {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    return;
  }
  try {
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      navigationType: metric.navigationType,
      rating: (metric as unknown as Record<string, unknown>).rating,
      timestamp: Date.now(),
    });
    navigator.sendBeacon(`${API_BASE}/perf/vitals`, payload);
  } catch {
    // Swallow beacon errors — telemetry must never break the app.
  }
};

/**
 * Default human-readable sink. Each metric fires once (per `id`) so duplicate
 * layout-shift cluster frames collapse to a single line. `toFixed(2)` keeps
 * CLS disambiguated near the 0.05/0.10 good/poor boundary (0.05 and 0.10
 * would otherwise both stringify as "0.1").
 *
 * Caller pushes more reporters at boot — e.g. a `navigator.sendBeacon`
 * network sink — without touching this file. Order matters: every metric
 * fans out to every reporter in registration order.
 */
const consoleReporter: Reporter = (metric) => {
  console.info(
    `[vitals] ${metric.name}=${metric.value.toFixed(2)} id=${metric.id} nav=${metric.navigationType}`,
  );
};

/**
 * Pluggable reporter list. Mutate at boot to add a network sink:
 *   `reporters.push((m) => navigator.sendBeacon('/api/perf', JSON.stringify(m)))`
 * Order is preserved; failures from one reporter do not interrupt the others.
 */
export const reporters: Reporter[] = [consoleReporter];

/**
 * Add the Logfire backend reporter when telemetry is enabled.
 * Call this once at boot if you want web-vitals in Logfire.
 */
export function enableLogfireReporter(): void {
  if (!reporters.includes(logfireReporter)) {
    reporters.push(logfireReporter);
  }
}

/**
 * Dispatch a single metric to every registered reporter. Order matters:
 * each reporter sees the metric in registration order. We deliberately
 * let reporter exceptions propagate rather than swallow them so a buggy
 * reporter surfaces in the dev console instead of silently dropping its
 * line of telemetry.
 */
export const reportVital: Reporter = (metric) => {
  for (const reporter of reporters) {
    reporter(metric);
  }
};

/**
 * One-shot guard. web-vitals silently deduplicates by `id` within the page
 * lifecycle, but if a future caller drops the PROD gate (e.g. for staging)
 * and React 19 StrictMode's dev double-mount fires the registration,
 * we'd get duplicate observers and duplicate reports. The guard makes the
 * function idempotent under repeated calls.
 *
 * TODO(future): add `onTTFB` here once backend perf work lands — TTFB is
 * the upstream cause of many LCP regressions and we want it visible on the
 * same dashboard as LCP/INP/CLS/FCP.
 */
let registered = false;

export function startProductionVitalsLogging(): void {
  if (registered) return;
  registered = true;
  onLCP(reportVital);
  onINP(reportVital);
  onCLS(reportVital);
  onFCP(reportVital);
}
