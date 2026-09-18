import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EmailScanAuditTable } from './EmailScanAuditTable';
import { toAuditJson } from '../utils/scanAudit';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('./AlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    alerts: [],
    removeAlert: vi.fn(),
  }),
}));
import type { ScanAuditRow } from '../mails/types';

function makeRow(overrides: Partial<ScanAuditRow> = {}): ScanAuditRow {
  return {
    emailId: 'm1',
    subject: 'Interview invitation for Senior Engineer at Acme',
    from: 'recruiter@acme.com',
    date: '2026-01-05T10:00:00.000Z',
    body: 'We would like to schedule an interview next week.',
    classification: { type: 'next_steps', confidence: 0.9, verdict: 'auto' },
    effectiveEvent: { type: 'next_steps', source: 'judgment' },
    extraction: { position: 'Senior Engineer', company: 'Acme' },
    outcome: 'update',
    matchedApplicationId: 'app-1',
    ...overrides,
  };
}

function storedLabels(): Record<string, Record<string, unknown>> {
  return JSON.parse(localStorage.getItem('emailScanAuditLabels') ?? '{}');
}

async function importFile(payload: string): Promise<void> {
  const file = new File([payload], 'labels.json', { type: 'application/json' });
  fireEvent.change(screen.getByTestId('audit-import-input'), { target: { files: [file] } });
  await vi.waitFor(() =>
    expect(screen.getByTestId('audit-import-banner')).toBeInTheDocument(),
  );
}

describe('EmailScanAuditTable', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('prompts to import when there is no scan and no import', () => {
    render(<EmailScanAuditTable rows={[]} />);

    expect(screen.getByTestId('audit-empty')).toBeInTheDocument();
    expect(screen.getByTestId('audit-import')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-table')).not.toBeInTheDocument();
  });

  it('shows the pipeline result, the deciding source and the stats', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    expect(screen.getByText('Interview invitation for Senior Engineer at Acme')).toBeInTheDocument();
    expect(screen.getByText('recruiter@acme.com')).toBeInTheDocument();
    expect(screen.getByTestId('audit-pipeline-m1')).toHaveTextContent('Interview / next steps · model · 0.90');
    expect(screen.getAllByText(/Senior Engineer/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('audit-stats')).toHaveTextContent(
      '1 emails · 0 reviewed (0 correct, 0 corrected)',
    );
  });

  it('shows the type the pipeline used even when the model saw nothing', () => {
    render(
      <EmailScanAuditTable
        rows={[
          makeRow({
            classification: null,
            effectiveEvent: { type: 'rejected', source: 'rule' },
            outcome: 'update',
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('audit-pipeline-m1')).toHaveTextContent('Rejection · rule');
    expect(screen.getByTestId('audit-pipeline-m1')).not.toHaveTextContent('not classified');
  });

  it('records a correction and updates the stats', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    const select = screen.getByLabelText(/Event type — Interview invitation/);
    fireEvent.change(select, { target: { value: 'rejected' } });

    expect(screen.getByTestId('audit-stats')).toHaveTextContent(
      '1 emails · 0 reviewed (0 correct, 1 corrected)',
    );
    expect(storedLabels().m1).toMatchObject({ eventType: 'rejected', correct: false });
  });

  it('marks a row correct in one click and moves it to the reviewed tab', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    fireEvent.click(screen.getByTestId('audit-correct-m1'));

    expect(storedLabels().m1).toMatchObject({
      reviewed: true,
      correct: true,
      eventType: 'next_steps',
    });
    expect(screen.getByTestId('audit-view-empty')).toHaveTextContent('Nothing pending');
    expect(screen.getByTestId('audit-stats')).toHaveTextContent(
      '1 emails · 1 reviewed (1 correct, 0 corrected)',
    );

    fireEvent.click(screen.getByTestId('audit-view-reviewed'));
    expect(screen.getByTestId('audit-correct-m1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('undoes a mark when the same button is clicked again', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    fireEvent.click(screen.getByTestId('audit-correct-m1'));
    fireEvent.click(screen.getByTestId('audit-view-reviewed'));
    fireEvent.click(screen.getByTestId('audit-correct-m1'));

    expect(storedLabels().m1).toMatchObject({ reviewed: false });
    expect(storedLabels().m1.correct).toBeUndefined();
    expect(screen.getByTestId('audit-stats')).toHaveTextContent('0 reviewed');
  });

  it('marks a row wrong without changing any field', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    fireEvent.click(screen.getByTestId('audit-incorrect-m1'));

    expect(storedLabels().m1).toMatchObject({ reviewed: true, correct: false });
    expect(screen.getByTestId('audit-stats')).toHaveTextContent('(0 correct, 1 corrected)');
  });

  it('stores a note without counting it as a correction', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    fireEvent.change(screen.getByLabelText(/Note — Interview invitation/), {
      target: { value: 'asked for a human follow-up' },
    });

    expect(storedLabels().m1).toMatchObject({ note: 'asked for a human follow-up' });
    expect(screen.getByTestId('audit-stats')).toHaveTextContent('0 corrected');
  });

  it('offers the rejection kinds only once the label is a rejection', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    expect(screen.queryByLabelText(/Rejection kind —/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Event type — Interview invitation/), {
      target: { value: 'rejected' },
    });

    const kind = screen.getByLabelText(/Rejection kind —/);
    fireEvent.change(kind, { target: { value: 'after_interview' } });

    expect(storedLabels().m1).toMatchObject({
      eventType: 'rejected',
      rejectionKind: 'after_interview',
    });
  });

  it('imports a JSON export, restores its labels and keeps reviewing', async () => {
    const payload = toAuditJson([makeRow()], {
      m1: { eventType: 'rejected', reviewed: true, correct: true },
    });

    render(<EmailScanAuditTable rows={[]} />);
    await importFile(payload);

    expect(screen.getByTestId('audit-import-banner')).toHaveTextContent('1 rows');
    expect(storedLabels().m1).toMatchObject({ eventType: 'rejected', correct: true });
    expect(screen.getByTestId('audit-stats')).toHaveTextContent('1 reviewed (1 correct');
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('rejects a file that is not an audit export', async () => {
    render(<EmailScanAuditTable rows={[]} />);

    const file = new File(['{"nope":true}'], 'x.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('audit-import-input'), { target: { files: [file] } });

    await vi.waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(screen.queryByTestId('audit-import-banner')).not.toBeInTheDocument();
  });

  it('reports the keyless baseline on demand', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    expect(screen.queryByTestId('audit-local-summary')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('audit-local'));

    expect(screen.getByTestId('audit-local-summary')).toHaveTextContent('of 1 match');
    expect(screen.getByTestId('audit-local-m1')).toBeInTheDocument();
  });

  it('copies only the labelled rows and reports the count on the button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <EmailScanAuditTable
        rows={[makeRow(), makeRow({ emailId: 'm2', subject: 'Job alert', outcome: 'skipped' })]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Event type — Interview invitation/), {
      target: { value: 'rejected' },
    });

    expect(screen.getByTestId('audit-copy')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('audit-copy'));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

    const payload = JSON.parse(writeText.mock.calls[0][0] as string);
    expect(payload.scannedTotal).toBe(2);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]).toMatchObject({ emailId: 'm1', label: { eventType: 'rejected' } });
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('refuses to copy when nothing is labelled yet', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<EmailScanAuditTable rows={[makeRow()]} />);
    fireEvent.click(screen.getByTestId('audit-copy'));

    expect(writeText).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  it('keeps the pipeline value as the placeholder for empty labels', () => {
    render(<EmailScanAuditTable rows={[makeRow()]} />);

    const cell = screen.getByTestId('audit-table');
    expect(within(cell).getByPlaceholderText('Senior Engineer')).toBeInTheDocument();
    expect(within(cell).getByPlaceholderText('Acme')).toBeInTheDocument();
  });
});
