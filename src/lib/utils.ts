import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const DAYS_BEFORE_DATE_FALLBACK = 30;

/** Human-friendly relative time: "just now", "5m ago", "3h ago", "12d ago", or "Jan 5" */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // passthrough invalid dates

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHr = Math.floor(diffMs / MS_PER_HOUR);
  const diffDay = Math.floor(diffMs / MS_PER_DAY);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < DAYS_BEFORE_DATE_FALLBACK) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}