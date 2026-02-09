// src/mails/providers/fake/fakeData.ts
export const FAKE_MESSAGES = [
    {
      id: 'm1',
      subject: 'Thank you for applying to Senior Engineer at Acme',
      from: 'recruiter@acme.com',
      body: 'Thanks for applying. We received your application.',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    {
      id: 'm2',
      subject: 'Interview invitation for Senior Engineer at Acme',
      from: 'recruiter@acme.com',
      body: 'We would like to schedule an interview next week.',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 24 * 1),
    },
    {
      id: 'm3',
      subject: 'Regret to inform you',
      from: 'no-reply@otherco.com',
      body: 'We regret to inform you that we will not move forward.',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
  ];
  