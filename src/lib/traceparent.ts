/**
 * W3C traceparent header generator for connecting frontend actions to backend traces.
 *
 * Generates a valid traceparent header (version 00) that can be propagated
 * via fetch/XHR so the backend continues the same trace.
 */

interface TraceContext {
  traceId: string;
  spanId: string;
  flags: string;
}

function generateId(len: number): string {
  const bytes = new Uint8Array(len / 2);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateTraceId(): string {
  return generateId(32);
}

function generateSpanId(): string {
  return generateId(16);
}

let currentTrace: TraceContext | null = null;

/**
 * Start a new frontend trace. Call this before a user action that triggers
 * API calls (e.g., page navigation, form submission).
 */
export function startTrace(): TraceContext {
  currentTrace = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    flags: '01',
  };
  return currentTrace;
}

/**
 * Get the current trace context, or start a new one if none exists.
 */
export function getTraceContext(): TraceContext {
  if (!currentTrace) {
    return startTrace();
  }
  return currentTrace;
}

/**
 * Build the W3C traceparent header value.
 * Rotates spanId per call so each backend request appears as a sibling
 * of the parent trace instead of all sharing the same spanId.
 */
export function buildTraceparent(ctx?: TraceContext): string {
  if (ctx) {
    return `00-${ctx.traceId}-${ctx.spanId}-${ctx.flags}`;
  }
  if (!currentTrace) {
    currentTrace = startTrace();
  }
  currentTrace.spanId = generateSpanId();
  return `00-${currentTrace.traceId}-${currentTrace.spanId}-${currentTrace.flags}`;
}

/**
 * Clear the current trace context.
 */
export function clearTrace(): void {
  currentTrace = null;
}
