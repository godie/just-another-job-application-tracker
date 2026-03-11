import { type JobApplication } from '../types/applications';

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
