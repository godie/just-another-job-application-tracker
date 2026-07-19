import { type BadgeProps } from '../components/ui/Badge';

const STATUS_VARIANT_MAP: Record<string, BadgeProps['variant']> = {
  rejected: 'danger',
  offer: 'success',
  hold: 'warning',
};

/**
 * @param status - The application status string (e.g., 'Applied', 'Rejected', 'Offer', 'Hold')
 * @returns The appropriate Badge variant name
 */
export const getBadgeVariantForStatus = (status: string): BadgeProps['variant'] => {
  return STATUS_VARIANT_MAP[status.toLowerCase()] || 'default';
};
