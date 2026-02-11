import React, { useState, useEffect, useCallback, useRef } from 'react';

interface AuthQuote {
  text: string;
  name: string;
  role: string;
  image: string;
}

// Only quotes with headshots, ordered by immediate appeal to our users
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

const STAGGER_DELAYS = [0, 100, 300, 500, 600] as const;

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * AUTH_QUOTES.length)
  );
  const [animClass, setAnimClass] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuote = AUTH_QUOTES[quoteIndex];

  // Transition to a specific quote index
  const transitionTo = useCallback((nextIndex: number) => {
    setAnimClass('animate-quote-exit');
    setTimeout(() => {
      setQuoteIndex(nextIndex);
      setAnimClass('animate-quote-enter');
    }, 400);
  }, []);

  // Auto-rotate every 8s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      transitionTo((quoteIndex + 1) % AUTH_QUOTES.length);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [quoteIndex, transitionTo]);

  const goToQuote = useCallback((i: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    transitionTo(i);
  }, [transitionTo]);

  // Replace broken image with initial fallback
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const parent = img.parentElement;
    if (!parent) return;
    const name = img.alt || '?';
    const fallback = document.createElement('div');
    fallback.className = 'h-11 w-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center ring-2 ring-white/10';
    fallback.innerHTML = `<span class="text-sm font-semibold text-white/60">${name.charAt(0)}</span>`;
    parent.replaceChild(fallback, img);
  }, []);

  // Progress bar segment width
  const segmentWidth = 100 / AUTH_QUOTES.length;
  const fillWidth = (quoteIndex + 1) * segmentWidth;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-7xl mx-auto flex rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 min-h-[600px] max-h-[calc(100vh-8rem)] ring-1 ring-gray-200/50">
        {/* Left panel — Editorial Brand Space */}
        <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-[#5D259F] via-[#4A1D80] to-[#2D1150]">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />

          {/* Noise texture overlay for premium feel */}
          <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }} />

          {/* Decorative glow blobs — slow 8s pulse */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-purple-400/10 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '4s' }} />

          {/* Warm accent edge — thin vertical line on right edge */}
          <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between px-8 py-12 xl:px-10 xl:py-16 w-full">
            {/* Top — logo mark + brand tagline (stagger 0ms) */}
            <div className="opacity-0 animate-fade-in" style={{ animationDelay: `${STAGGER_DELAYS[0]}ms`, animationFillMode: 'forwards' }}>
              {/* Logo mark — white variant */}
              <div className="flex items-end mb-8">
                <div
                  className="flex items-end justify-end bg-white/15 backdrop-blur-sm rounded-[2px] select-none ring-1 ring-white/10"
                  style={{ width: '44px', height: '28px', padding: '0 4px 3px 0' }}
                >
                  <span className="text-white font-bold leading-none" style={{ fontSize: '13px', letterSpacing: '0.02em' }}>
                    IN
                  </span>
                </div>
                <span
                  className="text-white/90 leading-none select-none"
                  style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '0.01em', marginLeft: '2px' }}
                >
                  CHRONICLE
                </span>
              </div>

              <h2 className="text-white text-3xl xl:text-4xl font-bold leading-snug tracking-tight">
                Let your work<br />do the talking.
              </h2>
              {/* Subtitle (stagger 100ms) */}
              <p
                className="mt-4 text-white/50 text-sm leading-relaxed max-w-xs opacity-0 animate-fade-in"
                style={{ animationDelay: `${STAGGER_DELAYS[1]}ms`, animationFillMode: 'forwards' }}
              >
                InChronicle connects to your tools and transforms everyday contributions into credible career stories.
              </p>
            </div>

            {/* Center — quote card (stagger 300ms) */}
            <div
              className="flex-1 flex items-center py-8 opacity-0 animate-fade-in"
              style={{ animationDelay: `${STAGGER_DELAYS[2]}ms`, animationFillMode: 'forwards' }}
            >
              <div className={animClass}>
                <blockquote className="relative">
                  {/* Decorative quote mark */}
                  <span className="absolute -top-8 -left-2 text-7xl text-white/10 font-serif select-none">&ldquo;</span>

                  <p className="text-white/90 text-xl xl:text-2xl font-medium font-serif leading-relaxed max-w-md">
                    {currentQuote.text}
                  </p>

                  {/* Persona */}
                  <footer className="mt-6 flex items-center gap-3">
                    {currentQuote.image ? (
                      <img
                        src={currentQuote.image}
                        alt={currentQuote.name}
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-white/20"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center ring-2 ring-white/10">
                        <span className="text-sm font-semibold text-white/60">
                          {currentQuote.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white/80 text-sm font-medium">{currentQuote.name}</p>
                      <p className="text-white/40 text-xs">{currentQuote.role}</p>
                    </div>
                  </footer>
                </blockquote>
              </div>
            </div>

            {/* Bottom — feature pills + progress bar */}
            <div className="space-y-5">
              {/* Feature pills (stagger 500ms) */}
              <div
                className="flex flex-wrap gap-2 opacity-0 animate-fade-in"
                style={{ animationDelay: `${STAGGER_DELAYS[3]}ms`, animationFillMode: 'forwards' }}
              >
                {FEATURE_PILLS.map(feature => (
                  <span
                    key={feature}
                    className="px-3 py-1 text-[11px] font-medium text-white/60 bg-white/5 rounded-full border border-white/10"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Progress bar (stagger 600ms) */}
              <div
                className="relative opacity-0 animate-fade-in"
                style={{ animationDelay: `${STAGGER_DELAYS[4]}ms`, animationFillMode: 'forwards' }}
              >
                {/* Visual bar */}
                <div className="w-full h-0.5 bg-white/10 rounded-full">
                  <div
                    className="h-full bg-white/50 rounded-full transition-all duration-700"
                    style={{ width: `${fillWidth}%` }}
                  />
                </div>
                {/* Clickable segments overlay */}
                <div className="absolute inset-0 flex">
                  {AUTH_QUOTES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToQuote(i)}
                      className="flex-1 h-4 -mt-2 cursor-pointer"
                      aria-label={`Quote ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — warm editorial surface */}
        <div className="flex-1 flex items-center justify-center bg-[#FAFAF8] px-6 py-12 relative">
          {/* Subtle radial warmth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-[#FAFAF8] to-primary-50/30" />

          <div className="relative z-10 w-full max-w-sm">
            {/* Mobile mini-quote */}
            <div className="lg:hidden mb-8 p-4 bg-white/80 rounded-xl border border-primary-100/50 shadow-sm backdrop-blur-sm">
              <p className="text-sm text-primary-800 italic leading-relaxed font-serif">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <p className="text-xs text-primary-500 mt-2">&mdash; {currentQuote.name}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
