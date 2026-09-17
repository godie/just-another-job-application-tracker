import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EmailScanAuditTable } from './EmailScanAuditTable';
import type { ScanAuditRow } from '../mails/types';

function makeRow(overrides: Partial<ScanAuditRow> = {}): ScanAuditRow {
  return {
    emailId: 'm1',
    subject: 'Interview invitation for Senior Engineer at Acme',
    from: 'recruiter@acme.com',
    date: '2026-01-05T10:00:00.000Z',
    body: 'We would like to schedule an interview next week.',
    classification: { type: 'next_steps', confidence: 0.9, verdict: 'auto' },
    extraction: { position: 'Senior Engineer', company: 'Acme' },
    outcome: 'update',
    matchedApplicationId: 'app-1',
    ...overrides,
  };
}

describe('EmailScanAuditTable', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('prompts to run a scan when there are no rows', () => {
    render(<EmailScanAuditTable rows={[]} />);

    expect(screen.getByTestId('audit-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-table')).not.toBeInTheDocument();
  });

  it('shows the pipeline result next to the email', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    expect(screen.getByText('Interview invitation for Senior Engineer at Acme')).toBeInTheDocument();
    expect(screen.getByText('recruiter@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/next_steps · 0.90/)).toBeInTheDocument();
    expect(screen.getAllByText(/Senior Engineer/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('audit-stats')).toHaveTextContent('1 emails · 0 reviewed · 0 corrected');
  });

  it('records a correction and updates the stats', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    const select = screen.getByLabelText(/Event type — Interview invitation/);
    fireEvent.change(select, { target: { value: 'rejected' } });

    expect(screen.getByTestId('audit-stats')).toHaveTextContent('1 emails · 1 reviewed · 1 corrected');
    const stored = JSON.parse(localStorage.getItem('emailScanAuditLabels') ?? '{}');
    expect(stored.m1).toMatchObject({ eventType: 'rejected', reviewed: true });
  });

  it('keeps the pipeline value as the placeholder for empty labels', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    const cell = screen.getByTestId('audit-table');
    expect(within(cell).getByPlaceholderText('Senior Engineer')).toBeInTheDocument();
    expect(within(cell).getByPlaceholderText('Acme')).toBeInTheDocument();
  });
});
