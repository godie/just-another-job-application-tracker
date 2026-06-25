import { type JobApplication, type InterviewStageType, type WorkType, type InterviewEvent, type ApplicationWithMetadata } from '../types/applications';
import { generateId } from './id';

const WORK_TYPES: WorkType[] = ['remote', 'on-site', 'hybrid'];

const columnToKeyMap: Record<string, keyof JobApplication> = {
  'position': 'position',
  'company': 'company',
  'location': 'location',
  'worktype': 'workType',
  'salary': 'salary',
  'status': 'status',
  'applicationdate': 'applicationDate',
  'interviewdate': 'interviewDate',
  'platform': 'platform',
  'contactname': 'contactName',
  'followupdate': 'followUpDate',
  'notes': 'notes',
  'link': 'link',
};

export const getCellValue = (item: ApplicationWithMetadata, columnId: string): string => {
  if (columnId === 'status' && item.translatedStatus) {
    return item.translatedStatus;
  }
  if (columnId === 'platform' && item.translatedPlatform) {
    return item.translatedPlatform;
  }
  if (columnId === 'workType' && item.translatedWorkType) {
    return item.translatedWorkType;
  }

  const directValue = item[columnId as keyof JobApplication];
  if (typeof directValue === 'string' || typeof directValue === 'number') {
    return directValue ? String(directValue) : '';
  }

  if (item.customFields && columnId in item.customFields) {
    return item.customFields[columnId] ?? '';
  }

  const normalizedColumn = columnId.toLowerCase().replace(/ /g, '').replace(/-/g, '');
  const key = columnToKeyMap[normalizedColumn];
  return key ? String(item[key] ?? '') : '';
};

const mapStatusToStageType = (status: string): InterviewStageType => {
  const statusMap: Record<string, InterviewStageType> = {
    'Applied': 'application_submitted',
    'Interviewing': 'technical_interview',
    'Offer': 'offer',
    'Rejected': 'rejected',
    'Withdrawn': 'withdrawn',
  };
  return statusMap[status] || 'application_submitted';
};

export const toWorkType = (s: string | undefined): WorkType | undefined =>
  s && WORK_TYPES.includes(s as WorkType) ? (s as WorkType) : undefined;

export const buildInitialTimeline = (
  applicationDate: string,
  status: string,
  interviewDate?: string
): InterviewEvent[] => {
  const timeline: InterviewEvent[] = [];

  if (applicationDate) {
    timeline.push({
      id: generateId(),
      type: 'application_submitted',
      date: applicationDate,
      status: 'completed',
    });
  }

  if (interviewDate) {
    const stageType = mapStatusToStageType(status);
    timeline.push({
      id: generateId(),
      type: stageType,
      date: interviewDate,
      status: status === 'Rejected' ? 'cancelled' : 'scheduled',
    });
  }

  return timeline;
};

/**
 * @param applications - List of current job applications
 * @param company - Company name to check
 * @param position - Position name to check
 * @returns boolean indicating if a duplicate exists (excluding 'Deleted' status
 */
export const isApplicationDuplicate = (
  applications: JobApplication[],
  company: string,
  position: string
): boolean => {
  const normalizedCompany = company.toLowerCase().trim();
  const normalizedPosition = position.toLowerCase().trim();

  return applications.some(
    (app) =>
      app.company.toLowerCase().trim() === normalizedCompany &&
      app.position.toLowerCase().trim() === normalizedPosition &&
      app.status !== 'Deleted'
  );
};
