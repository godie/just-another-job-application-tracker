import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EMAIL_EVENT_CRITERIA,
  EMAIL_EVENT_TYPES,
  MAX_EMAILS_PER_CLASSIFICATION,
  classifyEmailsWithJudgment,
  decideEventType,
} from './emailClassification';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

const emails = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    subject: `Email ${index}`,
    from: 'sender@example.com',
    body: `Body ${index}`,
  }));

describe('decideEventType', () => {
  it('accepts a confident type', () => {
    expect(decideEventType({ choice: 'rejected', confidence: 0.82 })).toEqual({
      type: 'rejected',
      verdict: 'auto',
      confidence: 0.82,
    });
  });

  it('flags the middle band for review', () => {
    expect(decideEventType({ choice: 'next_steps', confidence: 0.6 })).toEqual({
      type: 'next_steps',
      verdict: 'review',
      confidence: 0.6,
    });
  });

  it('ignores anything below the review gate', () => {
    expect(decideEventType({ choice: 'offer', confidence: 0.3 })).toEqual({
      type: null,
      verdict: 'none',
      confidence: 0.3,
    });
  });

  it('ignores options outside the event list', () => {
    expect(decideEventType({ choice: 'spam', confidence: 0.99 }).type).toBeNull();
  });

  it('ignores a missing answer', () => {
    expect(decideEventType(undefined)).toEqual({ type: null, verdict: 'none', confidence: 0 });
  });
});

describe('classifyEmailsWithJudgment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks one question per email in a single request', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: {
        email_0: { type: 'choice', choice: 'rejected', probabilities: { rejected: 0.9 }, confidence: 0.9 },
        email_1: { type: 'choice', choice: 'other', probabilities: { other: 0.8 }, confidence: 0.8 },
      },
      usage: null,
    });

    const decisions = await classifyEmailsWithJudgment(emails(2));

    expect(mockedAskJudgments).toHaveBeenCalledTimes(1);
    const [state, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toEqual(['email_0', 'email_1']);
    expect((state as { emails: unknown[] }).emails).toHaveLength(2);
    expect(decisions.get(0)).toEqual({ type: 'rejected', verdict: 'auto', confidence: 0.9 });
    expect(decisions.get(1)?.type).toBe('other');
  });

  it('caps the batch so a large mailbox stays one bounded request', async () => {
    mockedAskJudgments.mockResolvedValue({ answers: {}, usage: null });

    await classifyEmailsWithJudgment(emails(MAX_EMAILS_PER_CLASSIFICATION + 10));

    const [, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toHaveLength(MAX_EMAILS_PER_CLASSIFICATION);
    expect(Object.keys(questions.email_0.criteria).sort()).toEqual([...EMAIL_EVENT_TYPES].sort());
    EMAIL_EVENT_TYPES.forEach((type) => {
      expect(EMAIL_EVENT_CRITERIA[type]).toHaveProperty('what');
      expect(EMAIL_EVENT_CRITERIA[type]).toHaveProperty('not_for');
    });
  });

  it('returns an empty map when the judgment is unavailable', async () => {
    mockedAskJudgments.mockResolvedValue(null);

    await expect(classifyEmailsWithJudgment(emails(3))).resolves.toEqual(new Map());
  });

  it('skips non-choice answers', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: { email_0: { type: 'noul', noul: 0.4 } },
      usage: null,
    });

    await expect(classifyEmailsWithJudgment(emails(1))).resolves.toEqual(new Map());
  });

  it('does not call the service with no emails', async () => {
    await expect(classifyEmailsWithJudgment([])).resolves.toEqual(new Map());
    expect(mockedAskJudgments).not.toHaveBeenCalled();
  });
});
