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

let currentTrace: TraceContext | null = null;

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
    currentTrace = {
      traceId: generateId(32),
      spanId: generateId(16),
      flags: '01',
    };
  }
  currentTrace.spanId = generateId(16);
  return `00-${currentTrace.traceId}-${currentTrace.spanId}-${currentTrace.flags}`;
}
