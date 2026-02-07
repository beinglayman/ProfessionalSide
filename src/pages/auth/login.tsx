import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

// Persona-driven quotes — each quote comes with the thinker's photo and a brief role
interface LoginQuote {
  text: string;
  name: string;
  role: string;
  image: string;
}

const LOGIN_QUOTES: LoginQuote[] = [
  {
    text: "Don't do invisible work.",
    name: 'Chris Albon',
    role: 'Director of ML, Wikipedia',
    image: 'https://pbs.twimg.com/profile_images/1689434146498068480/0-EJbHgd_400x400.jpg',
  },
  {
    text: "If you don't tell your story, someone else will — and they'll get it wrong.",
    name: 'Career Wisdom',
    role: 'On owning your narrative',
    image: '', // no persona image, will show initial
  },
  {
    text: "Ideas in secret die. They need light and air or they starve to death.",
    name: 'Seth Godin',
    role: 'Author, This Is Marketing',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Seth_Godin_2016.jpg/440px-Seth_Godin_2016.jpg',
  },
  {
    text: "Most people work in their career. Very few work on their career. That's the gap.",
    name: 'Career Wisdom',
    role: 'On intentional growth',
    image: '',
  },
  {
    text: "If you don't remember everything important you did, your manager — no matter how great they are — probably doesn't either.",
    name: 'Julia Evans',
    role: 'Engineer & Author, Wizard Zines',
    image: 'https://pbs.twimg.com/profile_images/1652939213951295488/WlKVaFTe_400x400.jpg',
  },
  {
    text: "Become the best in the world at what you do. Keep redefining what you do until this is true.",
    name: 'Naval Ravikant',
    role: 'Co-founder, AngelList',
    image: 'https://pbs.twimg.com/profile_images/1256841238298292232/ycqwaMI2_400x400.jpg',
  },
  {
    text: "Once a day, after you've done your day's work, go back to your documentation and find one little piece of your process that you can share.",
    name: 'Austin Kleon',
    role: 'Author, Show Your Work!',
    image: 'https://pbs.twimg.com/profile_images/1574387452782616577/7JhkcfCO_400x400.jpg',
  },
  {
    text: "Careers are a jungle gym, not a ladder.",
    name: 'Sheryl Sandberg',
    role: 'Former COO, Meta',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Sheryl_Sandberg_2013.jpg/440px-Sheryl_Sandberg_2013.jpg',
  },
  {
    text: "Don't follow your passion; rather, let it follow you in your quest to become so good that they can't ignore you.",
    name: 'Cal Newport',
    role: 'Author, Deep Work',
    image: 'https://pbs.twimg.com/profile_images/1670115085016567812/sCVfcdFQ_400x400.jpg',
  },
  {
    text: "An accomplishment without evidence is just a claim. An accomplishment with evidence is a case.",
    name: 'Career Wisdom',
    role: 'On building your case',
    image: '',
  },
];

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * LOGIN_QUOTES.length)
  );
  const [quoteFading, setQuoteFading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Rotate quotes every 7 seconds with crossfade
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % LOGIN_QUOTES.length);
        setQuoteFading(false);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const currentQuote = LOGIN_QUOTES[quoteIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
      navigate('/timeline');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
    <div className="w-full max-w-7xl mx-auto flex rounded-xl overflow-hidden shadow-lg min-h-[600px] max-h-[calc(100vh-8rem)]">
      {/* Left panel — Brand + Persona Quotes */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-gradient-to-br from-[#5D259F] via-[#4A1D80] to-[#2D1150]">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Decorative glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-purple-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top — brand tagline */}
          <div>
            <h2 className="text-white text-2xl xl:text-3xl font-bold leading-snug tracking-tight">
              Let your work<br />do the talking.
            </h2>
            <p className="mt-4 text-white/50 text-sm leading-relaxed max-w-xs">
              InChronicle connects to your tools and transforms everyday contributions into credible career stories.
            </p>
          </div>

          {/* Center — persona quote card */}
          <div className="flex-1 flex items-center py-8">
            <div
              className={`transition-all duration-400 ${quoteFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
            >
              <blockquote className="relative">
                {/* Quote mark */}
                <span className="absolute -top-6 -left-2 text-5xl text-white/10 font-serif select-none">&ldquo;</span>

                <p className="text-white/90 text-lg xl:text-xl font-medium leading-relaxed max-w-md">
                  {currentQuote.text}
                </p>

                {/* Persona */}
                <footer className="mt-6 flex items-center gap-3">
                  {currentQuote.image ? (
                    <img
                      src={currentQuote.image}
                      alt={currentQuote.name}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
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

          {/* Bottom — dot indicators + feature pills */}
          <div className="space-y-6">
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {['AI-powered stories', 'Evidence-based', 'Privacy-first', 'Export-ready'].map(feature => (
                <span
                  key={feature}
                  className="px-3 py-1 text-xs font-medium text-white/60 bg-white/5 rounded-full border border-white/10"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Quote progress dots */}
            <div className="flex items-center gap-1.5">
              {LOGIN_QUOTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuoteFading(true);
                    setTimeout(() => {
                      setQuoteIndex(i);
                      setQuoteFading(false);
                    }, 300);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === quoteIndex
                      ? 'w-6 bg-white/60'
                      : 'w-1.5 bg-white/20 hover:bg-white/30'
                  }`}
                  aria-label={`Quote ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile — compact brand + quote */}
          <div className="lg:hidden mb-8">
            <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your InChronicle account</p>
            {/* Mobile mini-quote */}
            <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-xs text-primary-800 italic leading-relaxed">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <p className="mt-1 text-[10px] text-primary-500">&mdash; {currentQuote.name}</p>
            </div>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Pick up where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
