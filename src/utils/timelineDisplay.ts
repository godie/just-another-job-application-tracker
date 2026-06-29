
const englishDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return englishDateFormatter.format(d);
  } catch {
    return dateStr;
  }
}

export function getStageDisplayName(
  t: (key: string, defaultValue?: string) => string,
  type: string,
  customTypeName?: string,
): string {
  if (type === 'custom' && customTypeName) return customTypeName;
  return t(`insights.interviewTypes.${type}`, type.replace(/_/g, ' '));
}

export function getEventStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'bg-green-500',
    scheduled: 'bg-blue-500',
    cancelled: 'bg-gray-400',
    pending: 'bg-yellow-500',
  };
  return colors[status] || 'bg-gray-400';
}
