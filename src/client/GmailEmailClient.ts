import type { EmailProvider, RawEmail, Email } from '../mails/types';

interface GmailMessagePart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

export class GmailEmailClient implements EmailProvider {
    private accessToken: string;
    constructor(accessToken: string) {
      this.accessToken = accessToken;
    }

    pickBodyData(payload?: GmailMessagePart): string {
      if (!payload) return '';
    
      // prefer text/plain
      if (payload.mimeType === 'text/plain' && payload.body?.data) return payload.body.data;
    
      // fallback text/html
      if (payload.mimeType === 'text/html' && payload.body?.data) return payload.body.data;
    
      // recurse parts
      for (const p of payload.parts ?? []) {
        const found = this.pickBodyData(p);
        if (found) return found;
      }
      return '';
    }
    
     decodeBase64Url(data: string): string {
      const cleaned = data.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(cleaned);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }
    
  
    async search(query: string): Promise<string[]> {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
  
    const data = await res.json() as { messages?: { id: string }[] };
    return data.messages?.map((m) => m.id) ?? [];
    }
  
    async getMessage(id: string): Promise<RawEmail> {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
  
      const msg = await res.json();
  
      const headers: Record<string, string> = {};
      (msg.payload?.headers ?? []).forEach((h: { name: string; value: string }) => {
        headers[h.name.toLowerCase()] = h.value;
      });

      const bodyData = this.pickBodyData(msg.payload);
      const decodedBody = bodyData ? this.decodeBase64Url(bodyData) : '';

      const internalDate = Number(msg.internalDate);
      const date = Number.isFinite(internalDate) ? new Date(internalDate).toISOString() : new Date().toISOString();

  
      return {
        id: String(msg.id ?? ''),
        headers,
        body: decodedBody,
        date,
        internalDate: String(msg.internalDate ?? ''),
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
  }
  
  