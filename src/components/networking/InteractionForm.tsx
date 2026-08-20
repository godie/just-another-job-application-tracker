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
import type { InteractionChannel } from '../../types/networking';

interface InteractionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: {
    occurredAt: string;
    channel: InteractionChannel;
    summary: string;
    notes: string;
  }) => void;
  defaultChannel?: InteractionChannel;
}

const CHANNEL_OPTIONS: Array<{ value: InteractionChannel; key: string }> = [
  { value: 'email', key: 'email' },
  { value: 'linkedin', key: 'linkedin' },
  { value: 'phone', key: 'phone' },
  { value: 'video', key: 'video' },
  { value: 'in_person', key: 'in_person' },
  { value: 'event', key: 'event' },
  { value: 'other', key: 'other' },
];

export const InteractionForm: React.FC<InteractionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultChannel = 'email',
}) => {
  const { t } = useTranslation();
  const [occurredAt, setOccurredAt] = useState('');
  const [channel, setChannel] = useState<InteractionChannel>(defaultChannel);
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setOccurredAt(new Date().toISOString());
      setChannel(defaultChannel);
      setSummary('');
      setNotes('');
      setSummaryError(null);
    }
  }, [isOpen, defaultChannel]);

  useEffect(() => {
    if (isOpen && !occurredAt) {
      setOccurredAt(new Date().toISOString());
    }
  }, [isOpen, occurredAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = summary.trim();
    if (!trimmed) {
      setSummaryError(t('networking.contacts.nameRequired'));
      return;
    }
    onSave({
      occurredAt,
      channel,
      summary: trimmed,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('networking.interactions.formTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <Select
            id='interaction-channel'
            label={t('networking.interactions.channel')}
            value={channel}
            onChange={(e) => setChannel(e.target.value as InteractionChannel)}
            options={CHANNEL_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.key.replace(/_/g, ' '),
            }))}
            required
          />
          <Input
            id='interaction-summary'
            label={t('networking.interactions.summary')}
            value={summary}
            onChange={(e) => { setSummary(e.target.value); if (summaryError) setSummaryError(null); }}
            error={summaryError ?? undefined}
            required
          />
          <div>
            <label
              htmlFor='interaction-notes'
              className='block text-sm font-medium text-foreground mb-1'
            >
              {t('networking.interactions.notes')}
            </label>
            <Textarea
              id='interaction-notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className='gap-2'>
            <Button type='button' variant='ghost' onClick={onClose}>
              {t('networking.interactions.cancel')}
            </Button>
            <Button type='submit'>
              {t('networking.interactions.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

