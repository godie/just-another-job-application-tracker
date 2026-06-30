import type { EmailProvider, RawEmail, Email } from '../../types';
import { GmailRateLimitError } from '../../errors';

const RATE_LIMIT_STATUSES = [429, 503];

function throwIfNotOk(res: Response, body: { error?: { message?: string } }, context: string): never {
  if (res.ok) return undefined as never;
  if (RATE_LIMIT_STATUSES.includes(res.status)) {
    throw new GmailRateLimitError(
      res.status,
      body?.error?.message ?? 'Too many requests. Please try again in a few minutes.'
    );
  }
  throw new Error(body?.error?.message ?? `${context}: ${res.status}`);
}

export class GmailEmailClient implements EmailProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async search(query: string): Promise<string[]> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throwIfNotOk(res, body, 'Gmail search failed');
    }

    const data = body as { messages?: { id: string }[] };
    return data.messages?.map((m) => m.id) ?? [];
  }

  async getMessage(id: string): Promise<RawEmail> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      throwIfNotOk(res, body as { error?: { message?: string } }, 'Gmail getMessage failed');
    }

    const payload = body.payload as {
      headers?: { name: string; value: string }[];
      parts?: { mimeType: string; body?: { data?: string } }[];
      body?: { data?: string };
    } | undefined;
    const headers: Record<string, string> = {};
    for (const h of payload?.headers ?? []) {
      headers[h.name.toLowerCase()] = h.value;
    }

    const plainPart = payload?.parts?.find((p) => p.mimeType === 'text/plain');
    const htmlPart = payload?.parts?.find((p) => p.mimeType === 'text/html');
    
    const bodyData = plainPart?.body?.data ?? payload?.body?.data ?? '';
    let decodedBody = typeof bodyData === 'string' && bodyData
      ? atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'))
      : '';

    if (decodedBody.trim().length < 50 && htmlPart?.body?.data) {
      const htmlBodyData = htmlPart.body.data;
      const htmlData = atob(htmlBodyData.replace(/-/g, '+').replace(/_/g, '/'));
      decodedBody = this.parseHtmlBody(htmlData);
    }

    const internalDate = body.internalDate as string | undefined;
    const date = internalDate
      ? new Date(parseInt(internalDate, 10)).toISOString()
      : undefined;

    return {
      id: String(body.id ?? ''),
      headers,
      body: decodedBody,
      internalDate,
      date,
    };
  }

  normalize(raw: RawEmail): Email {
    const date =
      raw.date ??
      (raw.internalDate
        ? new Date(Number(raw.internalDate)).toISOString()
        : new Date().toISOString());

    return {
      id: raw.id,
      subject: raw.headers['subject'] ?? '',
      from: raw.headers['from'] ?? '',
      to: raw.headers['to'] ?? '',
      body: raw.body ?? '',
      date,
    };
  }

  private parseHtmlBody(html: string): string {
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/<br\s*\/?>/gi, '\n') // Preserve line breaks
      .replace(/<\/p>/gi, '\n\n')   // Paragraphs
      .replace(/<li[^>]*>/gi, '\n• '); // List items

    text = text.replace(/<[^>]+>/g, ' ');

    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'");

    text = text.replace(/=([0-9A-Fa-f]{2}(?:=[0-9A-Fa-f]{2})*)/g, (_, hexPairs) => {
      const pairs = hexPairs.split('=');
      const chars: number[] = [];
      for (const pair of pairs) {
        if (pair) {
          chars.push(parseInt(pair, 16));
        }
      }
      return String.fromCharCode(...chars);
    });

    text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    return text.slice(0, 5000);
  }
}
