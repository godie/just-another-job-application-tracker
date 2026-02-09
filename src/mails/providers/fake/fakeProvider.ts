// src/mails/providers/fake/fakeProvider.ts
import type { EmailProvider, RawEmail, Email } from '../../types';

type SeedMessage = {
  id: string;
  subject: string;
  from: string;
  to?: string;
  body: string;
  internalDate?: string; // timestamp ms as string or number
};

export class FakeEmailProvider implements EmailProvider {
  private store: Record<string, RawEmail> = {};

  constructor(seed: SeedMessage[] = []) {
    seed.forEach(m => this.addSeed(m));
  }

  // Añade mensajes de prueba al store
  addSeed(msg: SeedMessage) {
    const id = msg.id ?? cryptoRandomId();
    const internalDate = msg.internalDate ?? String(Date.now());
    this.store[id] = {
      id,
      headers: {
        subject: msg.subject,
        from: msg.from,
        to: msg.to ?? 'me@example.com',
      },
      body: msg.body,
      internalDate: String(internalDate),
    };
  }

  /** Extract meaningful keywords from Gmail-style query for simple matching in tests. */
  private keywordsFromQuery(query: string): string[] {
    const lower = query.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2 && !/^[():"]+$/.test(w));
    return [...words, ...lower.match(/\b(application|applied|regret|rejected|interview|schedule|offer|next steps)\b/g) ?? []];
  }

  async search(query: string): Promise<string[]> {
    const keywords = this.keywordsFromQuery(query);
    const ids = Object.values(this.store)
      .filter((raw) => {
        const subject = (raw.headers['subject'] ?? '').toLowerCase();
        const body = (raw.body ?? '').toLowerCase();
        const text = `${subject} ${body}`;
        if (keywords.length === 0) return true;
        return keywords.some((k) => text.includes(k));
      })
      .map((r) => r.id);
    return Promise.resolve(ids);
  }

  // Devuelve el RawEmail por id
  async getMessage(id: string): Promise<RawEmail> {
    const msg = this.store[id];
    if (!msg) throw new Error(`FakeEmailProvider: message ${id} not found`);
    return Promise.resolve(msg);
  }

  // Normaliza RawEmail a Email
  normalize(raw: RawEmail): Email {
    const subject = raw.headers['subject'] ?? '';
    const from = raw.headers['from'] ?? '';
    const to = raw.headers['to'] ?? '';
    const date = raw.internalDate ? new Date(Number(raw.internalDate)).toISOString() : new Date().toISOString();

    return {
      id: raw.id,
      subject,
      from,
      to,
      body: raw.body ?? '',
      date,
    };
  }

  // Utilidad para limpiar el store (tests)
  clear() {
    this.store = {};
  }

  // Utilidad para listar todos los mensajes (tests)
  listAll(): Email[] {
    return Object.values(this.store).map(r => this.normalize(r));
  }
}

// Helper simple para generar ids en entornos sin crypto.randomUUID
function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'fake-' + Math.random().toString(36).slice(2, 10);
}

export default FakeEmailProvider;
