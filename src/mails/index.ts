/**
 * Mails module: scan Gmail (or fake provider) to add applications and update statuses.
 */

export { useEmailScan } from './hooks/useEmailScan';
export {
  scanEmails,
  applyScanPreview,
  scanEmailsAndApply,
  type ScanResult,
} from './services/scanService';
export type { EmailProvider } from './providers/emailProvider';
export type {
  Email,
  RawEmail,
  Event,
  ParsedEvent,
  ScanPreview,
  ProposedAddition,
  ProposedUpdate,
  ApplyResult,
} from './types';
export { QUERIES } from './types';
export { GmailRateLimitError, isGmailRateLimitError } from './errors';
export { GmailEmailClient } from './providers/gmail/gmailClient';
export { FakeEmailProvider } from './providers/fake/fakeProvider';
export { FAKE_MESSAGES } from './providers/fake/fakeData';
