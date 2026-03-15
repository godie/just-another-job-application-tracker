import type { ProposedAddition, ProposedUpdate } from '../mails/types';
import type { InterviewStageType, JobApplication } from '../types/applications';

interface JsonAddition {
  position?: string;
  company?: string;
  status?: string;
  applicationDate?: string;
  notes?: string;
  platform?: string;
}

interface JsonUpdate {
  company?: string;
  position?: string;
  newEvent?: {
    type?: string;
    date?: string;
    notes?: string;
    status?: string;
  };
}

/**
 * Processes a JSON string containing job application additions and updates.
 *
 * @param jsonString - The raw JSON string from chatbot extraction
 * @param applications - Current list of applications to find existing ones for updates
 * @returns An object with proposed additions and updates
 */
export function processManualScanJson(
  jsonString: string,
  applications: JobApplication[]
): { additions: ProposedAddition[]; updates: ProposedUpdate[] } {
  const data = JSON.parse(jsonString);
  const now = Date.now();

  const additions: ProposedAddition[] = (data.additions || []).map((a: JsonAddition, index: number) => ({
    id: `json-add-${index}-${now}`,
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

  const updates: ProposedUpdate[] = (data.updates || []).map((u: JsonUpdate, index: number) => {
    const existingApp = applications.find(app =>
      app.company.toLowerCase().trim() === (u.company || '').toLowerCase().trim() &&
      app.position.toLowerCase().trim() === (u.position || '').toLowerCase().trim() &&
      app.status !== 'Deleted'
    );

    return {
      id: `json-update-${index}-${now}`,
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

  return { additions, updates };
}
