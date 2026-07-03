import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('traceparent header builder', () => {
  beforeEach(() => {
    // The module keeps a `currentTrace` reference at module scope so
    // subsequent calls can rotate spanId under a fixed traceId. Reset the
    // module cache before every test so each one starts with a clean slate.
    vi.resetModules();
  });

  it('generates a fresh trace with 32-char traceId, 16-char spanId, and sampled flag', async () => {
    const { buildTraceparent } = await import('./traceparent');
    const header = buildTraceparent();

    // W3C traceparent format: 00-{32 hex}-{16 hex}-{2 hex flags}
    const parts = header.split('-');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('00');
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[2]).toMatch(/^[0-9a-f]{16}$/);
    expect(parts[3]).toBe('01');
  });

  it('rotates the spanId between calls while keeping the same traceId', async () => {
    const { buildTraceparent } = await import('./traceparent');
    const first = buildTraceparent().split('-');
    const second = buildTraceparent().split('-');

    // traceId and flags stay constant across calls inside the same trace
    expect(second[0]).toBe(first[0]); // version 00
    expect(second[1]).toBe(first[1]); // traceId preserved
    expect(second[3]).toBe(first[3]); // flags preserved
    // spanId is regenerated
    expect(second[2]).not.toBe(first[2]);
    expect(second[2]).toMatch(/^[0-9a-f]{16}$/);
  });

  it('honors an explicit ctx argument verbatim without touching module state', async () => {
    const { buildTraceparent } = await import('./traceparent');
    const ctx = {
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      flags: '00',
    };

    const explicit = buildTraceparent(ctx);
    expect(explicit).toBe(`00-${ctx.traceId}-${ctx.spanId}-${ctx.flags}`);
  });
});
