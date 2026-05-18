# Task: Email Notifications

## Description
Implement a system to notify users of follow-ups, upcoming interviews, or status changes via email. This will help users stay on top of their job search without constantly checking the app.

## Acceptance Criteria
- [ ] Users can opt-in/out of different types of email notifications in Settings.
- [ ] Automated reminders for interviews 24 hours and 1 hour before the scheduled time.
- [ ] Weekly summary of job search progress.
- [ ] Integration with a mail service (e.g., SendGrid, Mailgun, or local SMTP via PHP backend).
- [ ] Email templates are responsive and follow the JAJAT branding.

## Tests
- **Unit Tests**: Verify the notification trigger logic (correct timing, correct user preferences).
- **Backend Tests**: Test the mailer service integration and template rendering.
- **E2E Tests**: Schedule an interview and verify a notification is queued/sent.
