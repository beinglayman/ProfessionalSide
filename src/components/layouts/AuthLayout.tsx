import React, { useState, useEffect, useCallback, useRef } from 'react';

interface AuthQuote {
  text: string;
  name: string;
  role: string;
  image: string;
}

// Ordered by immediate appeal to our target users (ICs who need to showcase their work)
const AUTH_QUOTES: AuthQuote[] = [
  {
    text: "Don't do invisible work.",
    name: 'Chris Albon',
    role: 'Director of ML, Wikipedia',
    image: '/headshots/chris-albon.jpg',
  },
  {
    text: "If you don't remember everything important you did, your manager — no matter how great they are — probably doesn't either.",
    name: 'Julia Evans',
    role: 'Engineer & Author, Wizard Zines',
    image: '/headshots/julia-evans.jpeg',
  },
  {
    text: "Ideas in secret die. They need light and air or they starve to death.",
    name: 'Seth Godin',
    role: 'Author, This Is Marketing',
    image: '/headshots/seth-godin.jpg',
  },
  {
    text: "Careers are a jungle gym, not a ladder.",
    name: 'Sheryl Sandberg',
    role: 'Former COO, Meta',
    image: '/headshots/sheryl-sandberg.jpg',
  },
  {
    text: "Don't follow your passion; rather, let it follow you in your quest to become so good that they can't ignore you.",
    name: 'Cal Newport',
    role: 'Author, Deep Work',
    image: '/headshots/cal-newport.jpeg',
  },
  {
    text: "Once a day, after you've done your day's work, go back to your documentation and find one little piece of your process that you can share.",
    name: 'Austin Kleon',
    role: 'Author, Show Your Work!',
    image: '/headshots/austin-kleon.jpg',
  },
  {
    text: "Become the best in the world at what you do. Keep redefining what you do until this is true.",
    name: 'Naval Ravikant',
    role: 'Co-founder, AngelList',
    image: '/headshots/naval-ravikant.jpg',
  },
];

const FEATURE_PILLS = ['AI-powered stories', 'Evidence-based', 'Privacy-first', 'Export-ready'];

// Staggered entrance: [logo, subtitle, quote, pills, progress]
const STAGGER_DELAYS = [0, 100, 300, 500, 600] as const;

const QUOTE_ROTATION_MS = 8000;
const QUOTE_TRANSITION_MS = 400;

// Shared background pattern style (dot grid)
const DOT_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
  backgroundSize: '24px 24px',
};

const NOISE_TEXTURE_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
};

const GLOW_DURATION: React.CSSProperties = { animationDuration: '8s' };
const GLOW_DURATION_DELAYED: React.CSSProperties = { animationDuration: '8s', animationDelay: '4s' };

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Reusable stagger animation wrapper
function StaggerIn({ delay, className = '', children }: {
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`opacity-0 animate-fade-in ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </div>
  );
}

// Logo — reused in header (dark variant) and auth panel (light variant)
function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark';
  return (
    <div className="flex items-end">
      <div
        className={`flex items-end justify-end rounded-[2px] select-none ${
          isDark ? 'bg-[#5D259F]' : 'bg-white/15 ring-1 ring-white/10 backdrop-blur-sm'
        }`}
        style={{ width: '44px', height: '28px', padding: '0 4px 3px 0' }}
      >
        <span className="text-white font-bold leading-none" style={{ fontSize: '13px', letterSpacing: '0.02em' }}>
          IN
        </span>
      </div>
      <span
        className={`leading-none select-none ${isDark ? 'text-gray-800' : 'text-white/90'}`}
        style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '0.01em', marginLeft: '2px' }}
      >
        CHRONICLE
      </span>
    </div>
  );
}

// Headshot with initial-letter fallback (React-managed, not raw DOM)
function Headshot({ src, name, size, ringClass }: {
  src: string;
  name: string;
  size: string;
  ringClass: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center ring-2 ring-white/10 flex-shrink-0`}>
        <span className="text-sm font-semibold text-white/60">{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${size} rounded-full object-cover ${ringClass} flex-shrink-0`}
      onError={() => setFailed(true)}
    />
  );
}

// Quote blockquote — shared between tablet and desktop
function QuoteBlock({ quote, size }: {
  quote: AuthQuote;
  size: 'md' | 'lg';
}) {
  const isLg = size === 'lg';
  return (
    <blockquote className="relative">
      <span className={`absolute ${isLg ? '-top-8 -left-2 text-7xl' : '-top-6 -left-1 text-5xl'} text-white/10 font-serif select-none`}>
        &ldquo;
      </span>
      <p className={`text-white/90 ${isLg ? 'text-xl xl:text-2xl max-w-md' : 'text-lg'} font-medium font-serif leading-relaxed`}>
        {quote.text}
      </p>
      <footer className={`${isLg ? 'mt-6' : 'mt-4'} flex items-center gap-3`}>
        <Headshot
          src={quote.image}
          name={quote.name}
          size={isLg ? 'h-11 w-11' : 'h-9 w-9'}
          ringClass="ring-2 ring-white/20"
        />
        <div>
          <p className="text-white/80 text-sm font-medium">{quote.name}</p>
          <p className="text-white/40 text-xs">{quote.role}</p>
        </div>
      </footer>
    </blockquote>
  );
}

// Feature pills row
function FeaturePills({ gap = 'gap-2', pillSize = 'text-[11px]', pillPx = 'px-3 py-1' }: {
  gap?: string;
  pillSize?: string;
  pillPx?: string;
}) {
  return (
    <>
      {FEATURE_PILLS.map(feature => (
        <span
          key={feature}
          className={`${pillPx} ${pillSize} font-medium text-white/60 bg-white/5 rounded-full border border-white/10`}
        >
          {feature}
        </span>
      ))}
    </>
  );
}

// Progress bar with clickable segments
function ProgressBar({ total, current, onSelect }: {
  total: number;
  current: number;
  onSelect: (i: number) => void;
}) {
  const fillWidth = ((current + 1) / total) * 100;
  return (
    <div className="relative">
      <div className="w-full h-0.5 bg-white/10 rounded-full">
        <div
          className="h-full bg-white/50 rounded-full transition-all duration-700"
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <div className="absolute inset-0 flex">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="flex-1 h-4 -mt-2 cursor-pointer"
            aria-label={`Quote ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// Background decorations for the brand panel.
// Uses inline styles for blob positioning because Tailwind purges dynamic class names.
function BrandPanelBackground({ blobPx = 384, offsetPx = 128 }: {
  blobPx?: number;
  offsetPx?: number;
}) {
  const blobDim = { width: blobPx, height: blobPx };
  return (
    <>
      <div className="absolute inset-0 opacity-[0.03]" style={DOT_PATTERN_STYLE} />
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={NOISE_TEXTURE_STYLE} />
      <div
        className="absolute rounded-full bg-purple-400/10 blur-3xl animate-pulse"
        style={{ ...GLOW_DURATION, ...blobDim, top: -offsetPx, right: -offsetPx }}
      />
      <div
        className="absolute rounded-full bg-indigo-400/10 blur-3xl animate-pulse"
        style={{ ...GLOW_DURATION_DELAYED, ...blobDim, bottom: -offsetPx, left: -offsetPx }}
      />
      <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
    </>
  );
}

// Custom hook for quote carousel rotation
function useQuoteCarousel() {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * AUTH_QUOTES.length)
  );
  const [animClass, setAnimClass] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startInterval = useCallback((fromIndex: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setAnimClass('animate-quote-exit');
      transitionTimeoutRef.current = setTimeout(() => {
        setQuoteIndex(prev => {
          const next = (prev + 1) % AUTH_QUOTES.length;
          return next;
        });
        setAnimClass('animate-quote-enter');
      }, QUOTE_TRANSITION_MS);
    }, QUOTE_ROTATION_MS);
  }, []);

  const goToQuote = useCallback((i: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setAnimClass('animate-quote-exit');
    transitionTimeoutRef.current = setTimeout(() => {
      setQuoteIndex(i);
      setAnimClass('animate-quote-enter');
      // Restart auto-rotation from the new quote
      startInterval(i);
    }, QUOTE_TRANSITION_MS);
  }, [startInterval]);

  useEffect(() => {
    startInterval(quoteIndex);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  // Only run on mount — startInterval is stable, quoteIndex changes shouldn't reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { quoteIndex, animClass, goToQuote };
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { quoteIndex, animClass, goToQuote } = useQuoteCarousel();
  const currentQuote = AUTH_QUOTES[quoteIndex];

  return (
    <>
      {/* ===================== MOBILE (<768px) ===================== */}
      <div className="md:hidden min-h-screen flex flex-col bg-gradient-to-br from-[#5D259F] via-[#4A1D80] to-[#2D1150] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={DOT_PATTERN_STYLE} />
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-purple-400/10 blur-3xl animate-pulse" style={GLOW_DURATION} />

        {/* Top — logo + tagline */}
        <div className="relative z-10 px-6 pt-8 pb-6">
          <StaggerIn delay={0}>
            <Logo variant="light" />
          </StaggerIn>
          <StaggerIn delay={100} className="mt-4 text-white/50 text-sm leading-relaxed max-w-[280px]">
            <p>Let your work do the talking.</p>
          </StaggerIn>
        </div>

        {/* Form card */}
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex-1 bg-white rounded-t-2xl px-6 py-8 overflow-y-auto">
            {children}
          </div>
        </div>

        {/* Bottom quote strip — min-h prevents layout shift between quotes */}
        <div className="bg-white px-6 pb-6 pt-2 border-t border-gray-100">
          <div className="flex items-start gap-3 min-h-[52px]">
            <Headshot
              src={currentQuote.image}
              name={currentQuote.name}
              size="h-8 w-8"
              ringClass="ring-1 ring-gray-200 mt-0.5"
            />
            <div className="min-w-0">
              <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-2">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <p className="text-[10px] text-gray-400 mt-1">{currentQuote.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TABLET (768px–1023px) ===================== */}
      <div className="hidden md:flex lg:hidden min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-5xl mx-auto flex rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 min-h-[550px] max-h-[calc(100vh-3rem)] ring-1 ring-gray-200/50">
          {/* Left panel */}
          <div className="w-[42%] relative overflow-hidden bg-gradient-to-br from-[#5D259F] via-[#4A1D80] to-[#2D1150] flex">
            <BrandPanelBackground blobPx={256} offsetPx={96} />

            <div className="relative z-10 flex flex-col justify-between px-7 py-10 w-full">
              <StaggerIn delay={STAGGER_DELAYS[0]}>
                <Logo variant="light" />
                <h2 className="mt-8 text-white text-2xl font-bold leading-snug tracking-tight">
                  Let your work<br />do the talking.
                </h2>
                <StaggerIn delay={STAGGER_DELAYS[1]} className="mt-3 text-white/50 text-sm leading-relaxed max-w-[240px]">
                  <p>InChronicle connects to your tools and transforms everyday contributions into credible career stories.</p>
                </StaggerIn>
              </StaggerIn>

              {/* Quote — min-h prevents layout shift between quotes of different lengths */}
              <StaggerIn delay={STAGGER_DELAYS[2]} className="flex-1 flex items-center py-6">
                <div className={`min-h-[200px] flex flex-col justify-center ${animClass}`}>
                  <QuoteBlock quote={currentQuote} size="md" />
                </div>
              </StaggerIn>

              <div className="space-y-4">
                <StaggerIn delay={STAGGER_DELAYS[3]} className="flex flex-wrap gap-1.5">
                  <FeaturePills gap="gap-1.5" pillSize="text-[10px]" pillPx="px-2.5 py-0.5" />
                </StaggerIn>
                <StaggerIn delay={STAGGER_DELAYS[4]}>
                  <ProgressBar total={AUTH_QUOTES.length} current={quoteIndex} onSelect={goToQuote} />
                </StaggerIn>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex items-center justify-center bg-[#FAFAF8] px-8 py-10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-[#FAFAF8] to-primary-50/30" />
            <div className="relative z-10 w-full max-w-sm">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== DESKTOP (>=1024px) ===================== */}
      <div className="hidden lg:flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-7xl mx-auto flex rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 min-h-[600px] max-h-[calc(100vh-2rem)] ring-1 ring-gray-200/50">
          {/* Left panel */}
          <div className="w-[48%] relative overflow-hidden bg-gradient-to-br from-[#5D259F] via-[#4A1D80] to-[#2D1150] flex">
            <BrandPanelBackground />

            <div className="relative z-10 flex flex-col justify-between px-8 py-12 xl:px-10 xl:py-16 w-full">
              <StaggerIn delay={STAGGER_DELAYS[0]}>
                <Logo variant="light" />
                <h2 className="mt-8 text-white text-3xl xl:text-4xl font-bold leading-snug tracking-tight">
                  Let your work<br />do the talking.
                </h2>
                <StaggerIn delay={STAGGER_DELAYS[1]} className="mt-4 text-white/50 text-sm leading-relaxed max-w-xs">
                  <p>InChronicle connects to your tools and transforms everyday contributions into credible career stories.</p>
                </StaggerIn>
              </StaggerIn>

              {/* Quote — min-h prevents layout shift between quotes of different lengths */}
              <StaggerIn delay={STAGGER_DELAYS[2]} className="flex-1 flex items-center py-8">
                <div className={`min-h-[220px] xl:min-h-[240px] flex flex-col justify-center ${animClass}`}>
                  <QuoteBlock quote={currentQuote} size="lg" />
                </div>
              </StaggerIn>

              <div className="space-y-5">
                <StaggerIn delay={STAGGER_DELAYS[3]} className="flex flex-wrap gap-2">
                  <FeaturePills />
                </StaggerIn>
                <StaggerIn delay={STAGGER_DELAYS[4]}>
                  <ProgressBar total={AUTH_QUOTES.length} current={quoteIndex} onSelect={goToQuote} />
                </StaggerIn>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex items-center justify-center bg-[#FAFAF8] px-6 py-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-[#FAFAF8] to-primary-50/30" />
            <div className="relative z-10 w-full max-w-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
