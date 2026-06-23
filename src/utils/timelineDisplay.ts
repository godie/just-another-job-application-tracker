// src/utils/timelineDisplay.ts
// Shared display helpers for interview timeline events.
// Used by TimelineView, JobDetailsPage, and other components.

/**
 * Format a date string (YYYY-MM-DD) into a locale-friendly display.
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Get a human-readable display name for an interview stage type.
 */
export function getStageDisplayName(
  t: (key: string, defaultValue?: string) => string,
  type: string,
  customTypeName?: string,
): string {
  if (type === 'custom' && customTypeName) return customTypeName;
  return t(`insights.interviewTypes.${type}`, type.replace(/_/g, ' '));
}

/**
 * Return a Tailwind background color class for an event status.
 */
export function getEventStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'bg-green-500',
    scheduled: 'bg-blue-500',
    cancelled: 'bg-gray-400',
    pending: 'bg-yellow-500',
  };
  return colors[status] || 'bg-gray-400';
}
