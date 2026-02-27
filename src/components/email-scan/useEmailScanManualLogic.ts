import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProposedAddition, ProposedUpdate } from '../../mails/types';
import { useApplicationsStore } from '../../stores/applicationsStore';
import type { InterviewStageType } from '../../types/applications';
import { useAlert } from '../AlertProvider';
import type { EmailScanAction, PreviewSetState } from './types';

interface EmailScanLogicProps {
  pastedJson: string;
  setPreview: PreviewSetState;
  dispatch: React.Dispatch<EmailScanAction>;
}

export function useEmailScanManualLogic({ pastedJson, setPreview, dispatch }: EmailScanLogicProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const applications = useApplicationsStore((state) => state.applications);

  const handleProcessJson = useCallback(() => {
    try {
      const data = JSON.parse(pastedJson);
      const additions: ProposedAddition[] = (data.additions || []).map((a: { position?: string; company?: string; status?: string; applicationDate?: string; notes?: string; platform?: string }, index: number) => ({
        id: `json-add-${index}-${Date.now()}`,
        data: {
          position: a.position || 'Unknown',
          company: a.company || 'Unknown',
          salary: '',
          status: a.status || 'Applied',
          applicationDate: a.applicationDate || new Date().toISOString().split('T')[0],
          interviewDate: '',
          timeline: [
            {
              id: crypto.randomUUID(),
              type: 'application_submitted',
              date: a.applicationDate || new Date().toISOString().split('T')[0],
              notes: a.notes || '',
              status: 'completed',
            }
          ],
          notes: a.notes || '',
          link: '',
          platform: a.platform || 'Email',
          contactName: '',
          followUpDate: '',
        },
        source: { subject: 'Chatbot extraction', date: new Date().toISOString() }
      }));

      const updates: ProposedUpdate[] = (data.updates || []).map((u: { company?: string; position?: string; newEvent?: { type?: string; date?: string; notes?: string; status?: string } }, index: number) => {
        const existingApp = applications.find(app =>
          app.company.toLowerCase().trim() === (u.company || '').toLowerCase().trim() &&
          app.position.toLowerCase().trim() === (u.position || '').toLowerCase().trim() &&
          app.status !== 'Deleted'
        );

        return {
          id: `json-update-${index}-${Date.now()}`,
          applicationId: existingApp?.id || '',
          company: u.company || 'Unknown',
          position: u.position || 'Unknown',
          newEvent: {
            id: crypto.randomUUID(),
            type: (u.newEvent?.type as InterviewStageType) || 'first_contact',
            date: u.newEvent?.date || new Date().toISOString().split('T')[0],
            notes: u.newEvent?.notes || '',
            status: (u.newEvent?.status as 'completed' | 'pending' | 'canceled') || 'completed',
          },
          source: { subject: 'Chatbot extraction', date: new Date().toISOString() }
        };
      });

      setPreview((prev) => ({
        proposedAdditions: [...(prev?.proposedAdditions || []), ...additions],
        proposedUpdates: [...(prev?.proposedUpdates || []), ...updates],
        emails: prev?.emails || []
      }));

      dispatch({ type: 'SELECT_ALL_ADDITIONS', payload: additions.map(a => a.id) });
      dispatch({ type: 'SELECT_ALL_UPDATES', payload: updates.map(u => u.id) });
      dispatch({ type: 'SET_PASTED_JSON', payload: '' });
      showSuccess(t('common.success') || 'JSON processed successfully');
    } catch {
      showError(t('settings.emailScan.invalidJson'));
    }
  }, [pastedJson, applications, setPreview, dispatch, showSuccess, showError, t]);

  return { handleProcessJson };
}
