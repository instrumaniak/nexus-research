export function formatRelativeTime(dateString: string): string {
  const target = new Date(dateString).getTime();
  const diffMs = target - Date.now();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diffMs / (60 * 1000));

  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}
