# Mails Scanner

Module to scan emails to:

- **Add applications**: detect "thank you for applying" / confirmation emails and create new entries in the job tracker.
- **Update statuses**: detect rejection, "next steps", and offer emails and add the corresponding timeline events to existing applications.

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

## Gmail
