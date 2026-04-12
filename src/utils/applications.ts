import { type JobApplication, type InterviewStageType, type WorkType, type InterviewEvent } from '../types/applications';
import { generateId } from './id';

export const WORK_TYPES: WorkType[] = ['remote', 'on-site', 'hybrid'];

/**
 * Helper function to map legacy status to interview stage type
 */
export const mapStatusToStageType = (status: string): InterviewStageType => {
  const statusMap: Record<string, InterviewStageType> = {
    'Applied': 'application_submitted',
    'Interviewing': 'technical_interview',
    'Offer': 'offer',
    'Rejected': 'rejected',
    'Withdrawn': 'withdrawn',
  };
  return statusMap[status] || 'application_submitted';
};

/**
 * Normalizes a string to a WorkType if it matches one of the known values.
 */
export const toWorkType = (s: string | undefined): WorkType | undefined =>
  s && WORK_TYPES.includes(s as WorkType) ? (s as WorkType) : undefined;

/**
 * Builds an initial timeline for an application based on its application date and status/interview date.
 */
export const buildInitialTimeline = (
  applicationDate: string,
  status: string,
  interviewDate?: string
): InterviewEvent[] => {
  const timeline: InterviewEvent[] = [];

  // Add application submitted event
  if (applicationDate) {
    timeline.push({
      id: generateId(),
      type: 'application_submitted',
      date: applicationDate,
      status: 'completed',
    });
  }

  // Add interview/status event
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
 * Checks if an application already exists for the same company and position.
 *
 * @param applications - List of current job applications
 * @param company - Company name to check
 * @param position - Position name to check
 * @returns boolean indicating if a duplicate exists (excluding 'Deleted' status)
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
