import React from 'react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

import { AlertProvider } from '../components/AlertProvider';
import NetworkingPage from './NetworkingPage';
import { useNetworkingStore } from '../stores/networkingStore';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';

const mockApplicationsState = {
  applications: [
    {
      id: 'app-1',
      position: 'Senior Frontend Engineer',
      company: 'Acme',
      salary: '',
      status: 'applied',
      applicationDate: '2026-01-01',
      interviewDate: '',
      timeline: [],
      notes: '',
      link: '',
      platform: '',
      contactName: '',
      followUpDate: '',
    } satisfies JobApplication,
  ],
};

const mockOpportunitiesState = {
  opportunities: [
    {
      id: 'opp-1',
      position: 'Staff Engineer',
      company: 'Globex',
      link: '',
      description: '',
      location: '',
      jobType: '',
      salary: '',
      postedDate: '2026-01-01',
      capturedDate: '2026-01-01',
    } satisfies JobOpportunity,
  ],
};

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: Object.assign(
    (selector: (state: typeof mockApplicationsState) => unknown) => selector(mockApplicationsState),
    { getState: () => mockApplicationsState },
  ),
}));

vi.mock('../stores/opportunitiesStore', () => ({
  useOpportunitiesStore: Object.assign(
    (selector: (state: typeof mockOpportunitiesState) => unknown) => selector(mockOpportunitiesState),
    { getState: () => mockOpportunitiesState },
  ),
}));

vi.mock('../components/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));

const renderNetworking = () =>
  render(
    <AlertProvider>
      <NetworkingPage />
    </AlertProvider>,
  );

describe('NetworkingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Use real timers + real Date so Radix Dialog animations and focus traps
    // settle naturally. Tests that need deterministic "now" install
    // vi.useFakeTimers + vi.setSystemTime locally.
    useNetworkingStore.getState().load();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the empty state with an "Add contact" call to action when no contacts exist', () => {
    renderNetworking();

    expect(screen.getByText('Networking')).toBeInTheDocument();
    expect(screen.getByText('No contacts yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add contact' })).toBeInTheDocument();
  });

  it('creates a contact via the labelled form and updates the empty state', async () => {
    renderNetworking();

    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }));

    const dialog = await screen.findByRole('dialog', { name: 'New contact' });
    const nameInput = within(dialog).getByLabelText(/^Name/);
    const relationSelect = within(dialog).getByLabelText(/Relationship/);

    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } });
    fireEvent.change(relationSelect, { target: { value: 'peer' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save contact' }));

    await waitFor(() => {
      expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    });
    expect(screen.queryByText('No contacts yet')).not.toBeInTheDocument();
  });

  it('renders Overdue before Today and Today before Upcoming follow-ups', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));

    useNetworkingStore.getState().addContact({ name: 'Lead', relationshipType: 'peer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    useNetworkingStore.getState().addFollowUpTask({ contactId, title: 'Overdue Task', dueAt: '2026-08-22T09:00:00.000Z' });
    useNetworkingStore.getState().addFollowUpTask({ contactId, title: 'Today Task', dueAt: '2026-08-24T15:00:00.000Z' });
    useNetworkingStore.getState().addFollowUpTask({ contactId, title: 'Upcoming Task', dueAt: '2026-08-26T09:00:00.000Z' });

    renderNetworking();

    const overdueList = screen.getByTestId('follow-ups-overdue');
    const todayList = screen.getByTestId('follow-ups-today');
    const upcomingList = screen.getByTestId('follow-ups-upcoming');

    // Boundaries: each task surfaces in exactly one section.
    expect(within(overdueList).getByText('Overdue Task')).toBeInTheDocument();
    expect(within(todayList).getByText('Today Task')).toBeInTheDocument();
    expect(within(upcomingList).getByText('Upcoming Task')).toBeInTheDocument();
    expect(within(overdueList).queryByText('Today Task')).toBeNull();
    expect(within(todayList).queryByText('Upcoming Task')).toBeNull();

    // DOM order: Overdue section → Today section → Upcoming section.
    const overdueHeading = screen.getByRole('heading', { name: 'Overdue' });
    const todayHeading = screen.getByRole('heading', { name: 'Today' });
    const upcomingHeading = screen.getByRole('heading', { name: 'Upcoming' });

    expect(
      overdueHeading.compareDocumentPosition(todayHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      todayHeading.compareDocumentPosition(upcomingHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    vi.useRealTimers();
  });

  it('logs an interaction under its selected contact', async () => {
    useNetworkingStore.getState().addContact({ name: 'Grace Hopper', relationshipType: 'peer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    renderNetworking();

    fireEvent.click(screen.getByRole('button', { name: 'Log interaction' }));

    const dialog = await screen.findByRole('dialog', { name: 'New interaction' });
    const channelSelect = within(dialog).getByLabelText(/Channel/);
    const summaryInput = within(dialog).getByLabelText(/Summary/);

    fireEvent.change(channelSelect, { target: { value: 'email' } });
    fireEvent.change(summaryInput, { target: { value: 'Sent intro email' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save interaction' }));

    await waitFor(() => {
      expect(
        useNetworkingStore.getState().interactions.find((i) => i.contactId === contactId)?.summary,
      ).toBe('Sent intro email');
    });

    // Visual confirmation: the summary appears in the rendered interactions
    // list. The match function filters by textContent substring so it does not
    // depend on whether the date/channel sit in adjacent sibling nodes.
    expect(
      screen.getByText(
        (content, element) => element?.tagName === 'LI' && content.includes('Sent intro email') === true,
      ),
    ).toBeInTheDocument();
  });

  it('links a contact to an application and stores the link', async () => {
    useNetworkingStore.getState().addContact({ name: 'Sam', relationshipType: 'peer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    renderNetworking();

    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/^Application/));
    fireEvent.change(within(dialog).getByLabelText(/Select resource/), { target: { value: 'app-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));

    await waitFor(() => {
      expect(useNetworkingStore.getState().getLinksForContact(contactId)).toHaveLength(1);
    });
    expect(useNetworkingStore.getState().getLinksForContact(contactId)[0]).toMatchObject({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });
  });

  it('rejects a duplicate link with a user-visible message', async () => {
    useNetworkingStore.getState().addContact({ name: 'Sam', relationshipType: 'peer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;
    useNetworkingStore
      .getState()
      .addContactLink({ contactId, resourceType: 'application', resourceId: 'app-1' });

    renderNetworking();

    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/^Application/));
    fireEvent.change(within(dialog).getByLabelText(/Select resource/), { target: { value: 'app-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));

    expect(useNetworkingStore.getState().getLinksForContact(contactId)).toHaveLength(1);
    expect(
      await screen.findByText('This contact is already linked to that resource.'),
    ).toBeInTheDocument();
  });

  it('adds a referral for a contact', async () => {
    useNetworkingStore.getState().addContact({ name: 'Sam', relationshipType: 'referrer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    renderNetworking();

    fireEvent.click(screen.getByRole('button', { name: 'Add referral' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Select resource/), { target: { value: 'opp-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save referral' }));

    await waitFor(() => {
      expect(useNetworkingStore.getState().getReferralsForContact(contactId)).toHaveLength(1);
    });
    expect(
      useNetworkingStore.getState().getReferralsForContact(contactId)[0],
    ).toMatchObject({
      contactId,
      resourceType: 'opportunity',
      resourceId: 'opp-1',
      status: 'requested',
    });
  });

  it('marks a follow-up as complete from the contact list', async () => {
    useNetworkingStore.getState().addContact({ name: 'Sam', relationshipType: 'peer', tags: [], notes: '' });
    const contactId = useNetworkingStore.getState().contacts[0]!.id;
    useNetworkingStore.getState().addFollowUpTask({
      contactId,
      title: 'Send intro',
      dueAt: '2099-08-24T09:00:00.000Z',
    });

    renderNetworking();

    // ContactRow and FollowUpList both surface the task; disambiguate by
    // scoping the click to the contact row.
    const row = screen.getByTestId('contact-row');
    fireEvent.click(within(row).getByRole('button', { name: 'Mark complete' }));

    await waitFor(() => {
      expect(useNetworkingStore.getState().followUpTasks[0]?.completedAt).toBeTruthy();
    });
    expect(within(row).getByText('Completed')).toBeInTheDocument();
  });
});
