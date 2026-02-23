/** SessionStorage key: signals that a background sync is in progress (set by callback, consumed by timeline) */
export const SYNC_IN_PROGRESS_KEY = 'sync-in-progress';

/** CustomEvent name: dispatched when journal/activity data changes outside of SSE (e.g. after sync HTTP response) */
export const JOURNAL_DATA_CHANGED_EVENT = 'journal-data-changed';
