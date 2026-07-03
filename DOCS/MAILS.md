# Mails Scanner

Module to scan emails to:

- **Add applications**: detect "thank you for applying" / confirmation emails and create new entries in the job tracker.
- **Update statuses**: detect rejection, "next steps", and offer emails and add the corresponding timeline events to existing applications.

## Architecture

```
src/mails/
├── adapter/
│   └── emailAdapter.ts          # Normalizes raw provider messages into EmailMessage
├── providers/
│   ├── emailProvider.ts         # Interface: EmailProvider
│   ├── fake/
│   │   └── fakeProvider.ts      # Test provider with seeded data
│   └── gmail/
│       └── gmailClient.ts       # Gmail API client implementation
├── services/
│   └── scanService.ts           # Orchestrates scan + apply preview logic
├── hooks/
│   └── useEmailScan.ts          # React hook for UI integration
├── types.ts                     # Domain types (EmailMessage, ScanResult, etc.)
└── errors.ts                    # Custom error types
```

## Usage

```ts
import { useEmailScan, GmailEmailClient } from '@/mails';

// With Gmail (use the access token from your auth flow)
const { scan, loading, error, result } = useEmailScan();
const client = new GmailEmailClient(accessToken);
await scan(client);
// result: { totalEvents, added, updated }
```

For tests, use `FakeEmailProvider` with `FAKE_MESSAGES` or your own seed data.

## Gmail Integration

The Gmail scanner requires a valid Google OAuth access token with the `gmail.readonly` scope. The scan process:

1. **Search**: queries Gmail for job-application-related keywords (e.g., "interview", "application confirmation", "hiring").
2. **Fetch**: retrieves matching email content and metadata.
3. **Parse**: extracts company name, position title, dates, and recruiter name.
4. **Preview**: presents extracted data as proposed additions/updates for user review.
5. **Apply**: user approves items, which are then persisted to the tracker.

All email processing happens **client-side** in the browser. Email content is never sent to our servers.

## Settings

The scan behavior can be configured in **Settings → Email Scan**:

- **Gemini API Key**: optional — enables AI-powered parsing of ambiguous emails.
- **Default Period**: how far back to scan (e.g., 30 days).
- **Chunked fetching**: large inboxes are fetched in chunks to respect rate limits.

## Error Handling

- **Rate limits**: handled with exponential backoff and a clear user message.
- **Auth failures**: user is prompted to re-link their Google account.
- **Network errors**: retry with exponential backoff; final failure surfaces a user-friendly message.
