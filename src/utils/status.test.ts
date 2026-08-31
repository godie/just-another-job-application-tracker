import { describe, it, expect } from 'vitest';
import { getBadgeVariantForStatus } from './status';

describe('getBadgeVariantForStatus', () => {
  it('returns danger for rejected status', () => {
    expect(getBadgeVariantForStatus('Rejected')).toBe('danger');
    expect(getBadgeVariantForStatus('rejected')).toBe('danger');
    expect(getBadgeVariantForStatus('REJECTED')).toBe('danger');
  });

  it('returns success for offer status', () => {
    expect(getBadgeVariantForStatus('Offer')).toBe('success');
    expect(getBadgeVariantForStatus('offer')).toBe('success');
  });

  it('returns warning for hold status', () => {
    expect(getBadgeVariantForStatus('Hold')).toBe('warning');
    expect(getBadgeVariantForStatus('hold')).toBe('warning');
  });

  it('returns default for other statuses', () => {
    expect(getBadgeVariantForStatus('Applied')).toBe('default');
    expect(getBadgeVariantForStatus('Interviewing')).toBe('default');
    expect(getBadgeVariantForStatus('Withdrawn')).toBe('default');
    expect(getBadgeVariantForStatus('')).toBe('default');
  });
});
