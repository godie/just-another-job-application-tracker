import { describe, it, expect, beforeEach } from 'vitest';
import { FakeEmailProvider } from './fakeProvider';
import { FAKE_MESSAGES } from './fakeData';

describe('FakeEmailProvider', () => {
  let provider: FakeEmailProvider;

  beforeEach(() => {
    provider = new FakeEmailProvider(FAKE_MESSAGES);
  });

  describe('constructor and addSeed', () => {
    it('seeds messages from array', () => {
      const list = provider.listAll();
      expect(list.length).toBe(FAKE_MESSAGES.length);
    });
  });

  describe('search', () => {
    it('returns message ids matching query keywords', async () => {
      const ids = await provider.search('application');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('m1');
    });

    it('returns ids for interview-related query', async () => {
      const ids = await provider.search('interview');
      expect(ids.length).toBeGreaterThan(0);
    });

    it('returns empty array for non-matching query', async () => {
      const ids = await provider.search('xyznonexistent');
      expect(ids).toEqual([]);
    });
  });

  describe('getMessage', () => {
    it('returns RawEmail for existing id', async () => {
      const raw = await provider.getMessage('m1');
      expect(raw.id).toBe('m1');
      expect(raw.headers['subject']).toContain('applying');
      expect(raw.headers['from']).toBe('recruiter@acme.com');
      expect(raw.body).toBeDefined();
    });

    it('throws for unknown id', async () => {
      await expect(provider.getMessage('nonexistent')).rejects.toThrow(
        'FakeEmailProvider: message nonexistent not found'
      );
    });
  });

  describe('normalize', () => {
    it('returns Email with subject, from, date', async () => {
      const raw = await provider.getMessage('m1');
      const email = provider.normalize(raw);
      expect(email.id).toBe('m1');
      expect(email.subject).toBeDefined();
      expect(email.from).toBe('recruiter@acme.com');
      expect(email.date).toBeDefined();
      expect(email.body).toBeDefined();
    });
  });

  describe('clear', () => {
    it('clears all messages', async () => {
      provider.clear();
      expect(provider.listAll()).toHaveLength(0);
      const ids = await provider.search('application');
      expect(ids).toEqual([]);
    });
  });
});
