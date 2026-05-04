const COOKIE_CONSENT_KEY = 'jajat_cookie_consent_v1';

export type ConsentLevel = 'essential' | 'all';

interface ConsentRecord {
  level: ConsentLevel;
  timestamp: string;
}

export function getStoredConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

export function hasConsent(): boolean {
  return getStoredConsent() !== null;
}

export function storeConsent(level: ConsentLevel): void {
  try {
    const record: ConsentRecord = {
      level,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    // ignore
  }
}
