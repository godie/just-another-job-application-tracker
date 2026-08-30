import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type { NetworkRelationshipType } from '../../types/networking';

export interface ContactInput {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  relationshipType: NetworkRelationshipType;
  tags: string[];
  notes: string;
}

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prefill values for edit mode; omit for create mode. */
  initial?: Partial<ContactInput>;
  onSave: (input: ContactInput) => void;
}

const RELATIONSHIP_TYPES: Array<{ value: NetworkRelationshipType; key: string }> = [
  { value: 'recruiter', key: 'recruiter' },
  { value: 'hiring_manager', key: 'hiring_manager' },
  { value: 'referrer', key: 'referrer' },
  { value: 'former_colleague', key: 'former_colleague' },
  { value: 'mentor', key: 'mentor' },
  { value: 'peer', key: 'peer' },
  { value: 'other', key: 'other' },
];

export const ContactForm: React.FC<ContactFormProps> = ({ isOpen, onClose, onSave, initial }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [relationshipType, setRelationshipType] = useState<NetworkRelationshipType>(
    initial?.relationshipType ?? 'peer',
  );
  const [tagsCsv, setTagsCsv] = useState((initial?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Prefill for edit mode; blank for create mode.
      setName(initial?.name ?? '');
      setCompany(initial?.company ?? '');
      setRole(initial?.role ?? '');
      setEmail(initial?.email ?? '');
      setRelationshipType(initial?.relationshipType ?? 'peer');
      setTagsCsv((initial?.tags ?? []).join(', '));
      setNotes(initial?.notes ?? '');
      setNameError(null);
    }
  }, [isOpen, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('networking.contacts.nameRequired'));
      return;
    }
    const tags = tagsCsv
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave({
      name: trimmed,
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      email: email.trim() || undefined,
      relationshipType,
      tags,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('networking.contacts.formTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <Input
            id='contact-name'
            label={t('networking.contacts.name')}
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
            error={nameError ?? undefined}
            required
            autoFocus
          />
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <Input
              id='contact-company'
              label={t('networking.contacts.company')}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Input
              id='contact-role'
              label={t('networking.contacts.role')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <Input
            id='contact-email'
            label={t('networking.contacts.email')}
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            id='contact-relationship'
            label={t('networking.contacts.relationshipType')}
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as NetworkRelationshipType)}
            options={RELATIONSHIP_TYPES.map((opt) => ({
              value: opt.value,
              label: opt.key.replace(/_/g, ' '),
            }))}
          />
          <Input
            id='contact-tags'
            label={t('networking.contacts.tags')}
            value={tagsCsv}
            onChange={(e) => setTagsCsv(e.target.value)}
          />
          <div>
            <label
              htmlFor='contact-notes'
              className='block text-sm font-medium text-foreground mb-1'
            >
              {t('networking.contacts.notes')}
            </label>
            <Textarea
              id='contact-notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className='gap-2'>
            <Button type='button' variant='ghost' onClick={onClose}>
              {t('networking.contacts.cancel')}
            </Button>
            <Button type='submit'>
              {t('networking.contacts.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

