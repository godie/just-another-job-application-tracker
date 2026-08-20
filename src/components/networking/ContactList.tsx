import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';
import { Select } from '../ui/Select';
import { useAlert } from '../AlertProvider';
import { useNetworkingStore } from '../../stores/networkingStore';
import { useApplicationsStore } from '../../stores/applicationsStore';
import { useOpportunitiesStore } from '../../stores/opportunitiesStore';
import { ContactForm } from './ContactForm';
import { InteractionForm } from './InteractionForm';
import type {
  InteractionChannel,
  NetworkContact,
  NetworkInteraction,
  NetworkRelationshipType,
  Referral,
  ResourceType,
} from '../../types/networking';
import type { JobApplication } from '../../types/applications';
import type { JobOpportunity } from '../../types/opportunities';

interface ResourceLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
}

type ResourceKind = ResourceType;

interface CombinedResource {
  id: string;
  kind: ResourceKind;
  position: string;
  company: string;
}

const ResourceLinkDialog: React.FC<ResourceLinkDialogProps> = ({
  isOpen,
  onClose,
  contactId,
}) => {
  const { t } = useTranslation();
  const { showError } = useAlert();
  const applications = useApplicationsStore((s) => s.applications);
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const addContactLink = useNetworkingStore((s) => s.addContactLink);
  const [kind, setKind] = useState<ResourceKind>('application');
  const [resourceId, setResourceId] = useState<string>('');

  const combined = (kind === 'application' ? applications : opportunities).map<CombinedResource>(
    (res) => ({ id: res.id, kind, position: res.position, company: res.company }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) return;
    const duplicate: string = t('networking.links.duplicate');
    const added = addContactLink({ contactId, resourceType: kind, resourceId });
    if (!added) {
      showError(duplicate);
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('networking.links.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <fieldset className='flex gap-4'>
            <legend className='sr-only'>{t('networking.links.selectResource')}</legend>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='radio'
                name='resource-kind'
                value='application'
                checked={kind === 'application'}
                onChange={() => { setKind('application'); setResourceId(''); }}
                aria-label={t('networking.links.application')}
              />
              {t('networking.links.application')}
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='radio'
                name='resource-kind'
                value='opportunity'
                checked={kind === 'opportunity'}
                onChange={() => { setKind('opportunity'); setResourceId(''); }}
                aria-label={t('networking.links.opportunity')}
              />
              {t('networking.links.opportunity')}
            </label>
          </fieldset>
          <Select
            id='link-resource'
            label={t('networking.links.selectResource')}
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            options={combined.map((res) => ({
              value: res.id,
              label: `${res.position} · ${res.company}`,
            }))}
            required
          />
          <DialogFooter className='gap-2'>
            <Button type='button' variant='ghost' onClick={onClose}>
              {t('networking.links.cancel')}
            </Button>
            <Button type='submit'>
              {t('networking.links.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ReferralDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
}

const ReferralDialog: React.FC<ReferralDialogProps> = ({ isOpen, onClose, contactId }) => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((s) => s.applications);
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const addReferral = useNetworkingStore((s) => s.addReferral);
  const [resourceId, setResourceId] = useState<string>('');

  const combined: CombinedResource[] = [
    ...applications.map<CombinedResource>((app: JobApplication) => ({
      id: app.id,
      kind: 'application',
      position: app.position,
      company: app.company,
    })),
    ...opportunities.map<CombinedResource>((opp: JobOpportunity) => ({
      id: opp.id,
      kind: 'opportunity',
      position: opp.position,
      company: opp.company,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) return;
    const target = combined.find((res) => res.id === resourceId);
    if (!target) return;
    addReferral({
      contactId,
      resourceType: target.kind,
      resourceId: target.id,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('networking.referrals.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <Select
            id='referral-resource'
            label={t('networking.referrals.selectResource')}
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            required
            options={combined.map((res) => ({
              value: res.id,
              label: `${res.position} · ${res.company}`,
            }))}
          />
          <DialogFooter className='gap-2'>
            <Button type='button' variant='ghost' onClick={onClose}>
              {t('networking.referrals.cancel')}
            </Button>
            <Button type='submit'>
              {t('networking.referrals.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RELATIONSHIP_LABEL: Record<NetworkRelationshipType, string> = {
  recruiter: 'recruiter',
  hiring_manager: 'hiring manager',
  referrer: 'referrer',
  former_colleague: 'former colleague',
  mentor: 'mentor',
  peer: 'peer',
  other: 'other',
};

const CHANNEL_LABEL: Record<InteractionChannel, string> = {
  email: 'email',
  linkedin: 'linkedin',
  phone: 'phone',
  video: 'video',
  in_person: 'in person',
  event: 'event',
  other: 'other',
};

const REFERRAL_STATUS_LABEL: Record<Referral['status'], string> = {
  planned: 'planned',
  requested: 'requested',
  introduced: 'introduced',
  submitted: 'submitted',
  declined: 'declined',
  completed: 'completed',
};

interface ContactRowProps {
  contact: NetworkContact;
  interactions: NetworkInteraction[];
  links: ReturnType<typeof useNetworkingStore.getState>['contactLinks'];
  referrals: ReturnType<typeof useNetworkingStore.getState>['referrals'];
  applications: JobApplication[];
  opportunities: JobOpportunity[];
}

const ContactRow: React.FC<ContactRowProps> = ({
  contact,
  interactions,
  links,
  referrals,
  applications,
  opportunities,
}) => {
  const { t } = useTranslation();
  const addInteraction = useNetworkingStore((s) => s.addInteraction);
  const completeFollowUp = useNetworkingStore((s) => s.completeFollowUp);
  const followUpTasks = useNetworkingStore((s) => s.followUpTasks);

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const linkLabel = (resourceType: ResourceType, resourceId: string): string => {
    const list = resourceType === 'application' ? applications : opportunities;
    const resource = list.find((r) => r.id === resourceId);
    return resource ? `${resource.position} · ${resource.company}` : resourceId;
  };

  const handleLogInteraction: React.ComponentProps<typeof InteractionForm>['onSave'] = (input) => {
    addInteraction({ ...input, contactId: contact.id, status: 'completed' });
  };

  const myTasks = followUpTasks
    .filter((task) => task.contactId === contact.id)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <Card className='p-4' data-testid='contact-row'>
      <header className='flex items-start justify-between gap-4 mb-2'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>{contact.name}</h3>
          <p className='text-sm text-muted-foreground'>
            {contact.company ? `${contact.company}` : ''}
            {contact.role ? ` · ${contact.role}` : ''}
          </p>
          <Badge variant='secondary' className='mt-1'>
            {RELATIONSHIP_LABEL[contact.relationshipType]}
          </Badge>
        </div>
      </header>

      <section aria-labelledby={`interactions-${contact.id}`} className='mt-3'>
        <h4
          id={`interactions-${contact.id}`}
          className='text-sm font-semibold mb-1'
        >
          {t('networking.contacts.interactionsFor', { name: contact.name })}
        </h4>
        {interactions.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('networking.contacts.noInteractions')}</p>
        ) : (
          <ul className='space-y-1 text-sm' data-testid='contact-interactions'>
            {interactions.map((interaction) => (
              <li key={interaction.id} data-testid='contact-interaction-row'>
                <span className='font-mono text-xs text-muted-foreground'>
                  {new Date(interaction.occurredAt).toLocaleDateString()}
                </span>{' '}
                <span className='font-medium'>{CHANNEL_LABEL[interaction.channel]}</span>
                {' · '}
                {interaction.summary}
              </li>
            ))}
          </ul>
        )}
        <Button
          variant='outline'
          size='sm'
          className='mt-2'
          onClick={() => setInteractionOpen(true)}
        >
          {t('networking.contacts.logInteraction')}
        </Button>
      </section>

      <section aria-labelledby={`links-${contact.id}`} className='mt-4 border-t border-border pt-3'>
        <h4 id={`links-${contact.id}`} className='text-sm font-semibold mb-1'>
          {t('networking.links.title')}
        </h4>
        {links.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('networking.links.empty')}</p>
        ) : (
          <ul className='text-sm space-y-1' data-testid='contact-links'>
            {links.map((link) => (
              <li key={link.id}>
                {link.resourceType === 'application'
                  ? t('networking.links.application')
                  : t('networking.links.opportunity')}
                {' · '}
                {linkLabel(link.resourceType, link.resourceId)}
              </li>
            ))}
          </ul>
        )}
        <Button variant='outline' size='sm' className='mt-2' onClick={() => setLinkOpen(true)}>
          {t('networking.links.addCta')}
        </Button>
      </section>

      <section
        aria-labelledby={`referrals-${contact.id}`}
        className='mt-4 border-t border-border pt-3'
      >
        <h4 id={`referrals-${contact.id}`} className='text-sm font-semibold mb-1'>
          {t('networking.referrals.title')}
        </h4>
        {referrals.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('networking.referrals.empty')}</p>
        ) : (
          <ul className='text-sm space-y-1' data-testid='contact-referrals'>
            {referrals.map((referral) => (
              <li key={referral.id}>
                {linkLabel(referral.resourceType, referral.resourceId)}{' '}
                <Badge variant='secondary'>{REFERRAL_STATUS_LABEL[referral.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant='outline'
          size='sm'
          className='mt-2'
          onClick={() => setReferralOpen(true)}
        >
          {t('networking.referrals.addCta')}
        </Button>
      </section>

      {myTasks.length > 0 && (
        <section aria-labelledby={`tasks-${contact.id}`} className='mt-4 border-t border-border pt-3'>
          <h4 id={`tasks-${contact.id}`} className='text-sm font-semibold mb-1'>
            {t('networking.followUps.addTitle')}
          </h4>
          <ul className='text-sm space-y-2'>
            {myTasks.map((task) => (
              <li key={task.id} className='flex items-center justify-between gap-3'>
                <div>
                  <span className='font-medium'>{task.title}</span>
                  <span className='ml-2 font-mono text-xs text-muted-foreground'>
                    {new Date(task.dueAt).toLocaleDateString()}
                  </span>
                  {task.completedAt && (
                    <Badge variant='secondary' className='ml-2'>
                      {t('networking.followUps.completed')}
                    </Badge>
                  )}
                </div>
                {!task.completedAt && (
                  <Button variant='outline' size='sm' onClick={() => completeFollowUp(task.id)}>
                    {t('networking.followUps.complete')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InteractionForm
        isOpen={interactionOpen}
        onClose={() => setInteractionOpen(false)}
        onSave={handleLogInteraction}
      />
      <ResourceLinkDialog
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        contactId={contact.id}
      />
      <ReferralDialog
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
        contactId={contact.id}
      />
    </Card>
  );
};

export const ContactList: React.FC = () => {
  const { t } = useTranslation();
  const contacts = useNetworkingStore((s) => s.contacts);
  const interactions = useNetworkingStore((s) => s.interactions);
  const links = useNetworkingStore((s) => s.contactLinks);
  const referrals = useNetworkingStore((s) => s.referrals);
  const applications = useApplicationsStore((s) => s.applications);
  const opportunities = useOpportunitiesStore((s) => s.opportunities);
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate: React.ComponentProps<typeof ContactForm>['onSave'] = (input) => {
    useNetworkingStore.getState().addContact({ ...input });
  };

  return (
    <div className='space-y-4' data-testid='contact-list'>
      <Button onClick={() => setCreateOpen(true)} data-testid='add-contact-cta'>
        {t('networking.empty.cta')}
      </Button>
      {contacts.length === 0 ? null : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              interactions={interactions.filter((i) => i.contactId === contact.id)}
              links={links.filter((l) => l.contactId === contact.id)}
              referrals={referrals.filter((r) => r.contactId === contact.id)}
              applications={applications}
              opportunities={opportunities}
            />
          ))}
        </div>
      )}
      <ContactForm isOpen={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
    </div>
  );
};

