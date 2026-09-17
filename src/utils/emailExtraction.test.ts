import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Email } from '../mails/types';
import {
  MAX_EXTRACTION_EMAILS,
  buildExtractionCandidates,
  decideExtraction,
  extractWithJudgment,
} from './emailExtraction';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'm1',
    subject: 'Acme — Interview invitation for Senior Engineer',
    from: '"Acme Recruiting" <talent@acme.com>',
    body: 'Thanks for applying to the Senior Engineer role at Acme.',
    date: '2026-01-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildExtractionCandidates', () => {
  it('splits the subject into company and position candidates', () => {
    const { company, position } = buildExtractionCandidates(makeEmail());

    expect(company).toContain('Acme');
    expect(position).toContain('Interview invitation for Senior Engineer');
    expect(company.length).toBeLessThanOrEqual(30);
  });

  it('gathers body phrases, sender name and domain as company candidates', () => {
    const { company } = buildExtractionCandidates(
      makeEmail({
        subject: 'Sobre tu candidatura',
        from: 'people@globex.io',
        body: 'Estamos encantados de invitarte a entrevista para el puesto de Software Engineer Senior.',
      }),
    );

    expect(company).toContain('globex');
    expect(company.some((candidate) => candidate.toLowerCase() === 'people')).toBe(false);
  });

  it('trims trailing connectors from candidate spans', () => {
    const { position } = buildExtractionCandidates(
      makeEmail({
        subject: 'Oportunidad: Backend Engineer en Globex',
        body: 'Te escribo por una vacante de Backend Engineer en Globex.',
      }),
    );

    expect(position).toContain('Backend Engineer');
    expect(position.some((candidate) => /\sen$/.test(candidate))).toBe(false);
  });

  it('offers the clean role span before the full phrase', () => {
    const { position } = buildExtractionCandidates(
      makeEmail({
        subject: 'Acme — Interview invitation for Senior Engineer',
        body: 'We would like to schedule an interview.',
      }),
    );

    expect(position[0]).toBe('Senior Engineer');
    expect(position).toContain('Interview invitation for Senior Engineer');
  });

  it('detects Spanish titles', () => {
    const { position } = buildExtractionCandidates(
      makeEmail({
        subject: 'Confirmación de postulación',
        body: 'Confirmamos tu postulación para el puesto de Ingeniero de Software Senior en Acme Corp.',
      }),
    );

    expect(position.some((candidate) => /ingeniero/i.test(candidate))).toBe(true);
  });

  it('dedupes case-insensitively and keeps the first spelling', () => {
    const { company } = buildExtractionCandidates(
      makeEmail({ subject: 'Acme — update', body: 'Update from acme about your application.' }),
    );

    expect(company.filter((candidate) => candidate.toLowerCase() === 'acme')).toHaveLength(1);
    expect(company).toContain('Acme');
  });

  it('skips mailbox and ATS domains as employers', () => {
    const { company } = buildExtractionCandidates(
      makeEmail({ from: 'no-reply@greenhouse.io', subject: 'Application received', body: 'We received your application.' }),
    );

    expect(company.some((candidate) => /greenhouse/i.test(candidate))).toBe(false);
  });
});

describe('decideExtraction', () => {
  const candidates = { company: ['Acme', 'Acme Corp'], position: ['Senior Engineer', 'Software Engineer Senior'] };

  it('copies the picked candidate and reports auto above the gate', () => {
    expect(
      decideExtraction(
        { choice: 'Acme Corp', confidence: 0.9 },
        { choice: 'Senior Engineer', confidence: 0.85 },
        candidates,
      ),
    ).toEqual({ company: 'Acme Corp', position: 'Senior Engineer', verdict: 'auto', confidence: 0.85 });
  });

  it('flags the review band using the lowest confidence', () => {
    const decision = decideExtraction(
      { choice: 'Acme', confidence: 0.95 },
      { choice: 'Senior Engineer', confidence: 0.55 },
      candidates,
    );

    expect(decision.verdict).toBe('review');
    expect(decision.confidence).toBeCloseTo(0.55);
  });

  it('ignores answers that are not candidates or below the review gate', () => {
    expect(decideExtraction({ choice: 'invented', confidence: 0.99 }, undefined, candidates).company).toBeUndefined();
    expect(decideExtraction({ choice: 'Acme', confidence: 0.3 }, undefined, candidates).company).toBeUndefined();
  });

  it('reports none when nothing is picked', () => {
    expect(decideExtraction({ choice: 'none', confidence: 0.9 }, undefined, candidates)).toEqual({
      verdict: 'none',
      confidence: 0.9,
    });
  });
});

describe('extractWithJudgment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks company and position per email in one request', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: {
        email_0_company: { type: 'choice', choice: 'Acme', probabilities: { Acme: 0.9 }, confidence: 0.9 },
        email_0_position: { type: 'choice', choice: 'Senior Engineer', probabilities: {}, confidence: 0.88 },
      },
      usage: null,
    });

    const extractions = await extractWithJudgment([makeEmail()]);

    expect(mockedAskJudgments).toHaveBeenCalledTimes(1);
    const [state, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toEqual(['email_0_company', 'email_0_position']);
    const candidates = (state as { emails: { candidates: unknown }[] }).emails[0].candidates;
    expect(candidates).toHaveProperty('company');
    expect(extractions.get(0)).toMatchObject({ company: 'Acme', position: 'Senior Engineer', verdict: 'auto' });
  });

  it('caps the batch so one request stays within the question limit', async () => {
    mockedAskJudgments.mockResolvedValue({ answers: {}, usage: null });

    await extractWithJudgment(Array.from({ length: MAX_EXTRACTION_EMAILS + 5 }, (_, i) => makeEmail({ id: `m${i}` })));

    const [, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toHaveLength(MAX_EXTRACTION_EMAILS * 2);
  });

  it('returns an empty map when the judgment is unavailable', async () => {
    mockedAskJudgments.mockResolvedValue(null);

    await expect(extractWithJudgment([makeEmail()])).resolves.toEqual(new Map());
  });

  it('does not call the service with no emails', async () => {
    await expect(extractWithJudgment([])).resolves.toEqual(new Map());
    expect(mockedAskJudgments).not.toHaveBeenCalled();
  });
});
