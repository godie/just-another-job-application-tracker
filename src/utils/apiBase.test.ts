import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './apiBase';

describe('resolveApiBaseUrl', () => {
  it('uses the same-origin API fallback when no URL is configured', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api');
    expect(resolveApiBaseUrl('   ')).toBe('/api');
  });

  it('trims configured URLs and removes trailing slashes', () => {
    expect(resolveApiBaseUrl(' https://api.example.test/// ')).toBe('https://api.example.test');
    expect(resolveApiBaseUrl('/custom-api/')).toBe('/custom-api');
  });
});
