export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = past.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) === 0) return 'Today';
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');
  if (Math.abs(diffDays) < 30) return rtf.format(Math.round(diffDays / 7), 'week');
  return rtf.format(Math.round(diffDays / 30), 'month');
}
