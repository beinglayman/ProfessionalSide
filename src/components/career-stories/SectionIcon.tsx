import { cn } from '../../lib/utils';

export function SectionIcon({ sectionKey, className }: { sectionKey: string; className?: string }) {
  const key = sectionKey.toLowerCase();
  const base = cn('w-5 h-5 shrink-0', className);

  const wrap = (children: React.ReactNode) => (
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );

  switch (key) {
    case 'situation':
      return wrap(
        <>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'task':
    case 'problem':
      return wrap(
        <>
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7.5 10.5L9 12l3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );

    case 'action':
    case 'actions':
      return wrap(
        <>
          <path d="M14.5 2.5l3 3-9.5 9.5-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'result':
    case 'results':
      return wrap(
        <>
          <polyline points="3,15 7,9 11,12 17,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="13,5 17,5 17,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="18" x2="17" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'learning':
    case 'learnings':
      return wrap(
        <>
          <path d="M10 4C8 2.5 5 2 2 3v13c3-1 6-.5 8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 4c2-1.5 5-2 8-1v13c-3-1-6-.5-8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );

    case 'challenge':
    case 'obstacles':
    case 'hindrances':
      return wrap(
        <>
          <path d="M10 2L3 5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5l-7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10.5 7L9 11h2.5L10 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );

    case 'evaluation':
    case 'reflection':
      return wrap(
        <>
          <path d="M10 2a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="8" y1="15" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8.5" y1="17" x2="11.5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'context':
      return wrap(
        <>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="10" cy="10" rx="3.5" ry="8" stroke="currentColor" strokeWidth="1.2" />
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3 6h14" stroke="currentColor" strokeWidth="1" />
          <path d="M3 14h14" stroke="currentColor" strokeWidth="1" />
        </>
      );

    case 'impact':
      return wrap(
        <>
          <path d="M10 18s-2-2-2-6c0-4 2-9 2-9s2 5 2 9c0 4-2 6-2 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 14l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13 14l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        </>
      );

    case 'approach':
      return wrap(
        <>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="10,4 12,9 10,10 8,9" fill="currentColor" opacity="0.6" />
          <polygon points="10,16 8,11 10,10 12,11" stroke="currentColor" strokeWidth="1" />
        </>
      );

    case 'outcome':
      return wrap(
        <>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.5 10.5L9 13l5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );

    default:
      return wrap(
        <>
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
  }
}
