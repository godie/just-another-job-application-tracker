import { type BadgeProps } from '../components/ui/Badge';

/**
 * @param status - The application status string (e.g., 'Applied', 'Rejected', 'Offer', 'Hold')
 * @returns The appropriate Badge variant name
 */
export const getBadgeVariantForStatus = (status: string): BadgeProps['variant'] => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'rejected') return 'danger';
  if (statusLower === 'offer') return 'success';
  if (statusLower === 'hold') return 'warning';
  return 'default';
};
