import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, Briefcase, TrendingUp, Users, CheckCircle2, Eye, BarChart3, Shield, Award, Verified } from 'lucide-react';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-end mb-8">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 border border-primary-200">
                InChronicle for Professionals
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl mt-16 mb-16">
              Let your work do the talking.
              <br />
              <span className="relative inline-block">
                <span
                  className="absolute -left-12 -top-2 text-3xl sm:text-5xl lg:text-6xl text-red-500 rotate-[-5deg]"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 400
                  }}
                >
                  In
                  <svg
                    className="absolute left-0 -bottom-2"
                    width="50"
                    height="10"
                    viewBox="0 0 50 10"
                    style={{ transform: 'rotate(-3deg)' }}
                  >
                    <path
                      d="M 2 5 Q 15 3, 25 5 T 48 5"
                      stroke="#ef4444"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="text-primary-600">Chronicle your professional journey.</span>
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl text-center mx-auto leading-relaxed">
              A platform that secures your work legacy, tracks your progress, 
              and builds meaningful professional relationships through validated achievements.
            </p>
            <div className="mt-12 flex items-center justify-center">
              <Button size="lg" className="px-8 py-4 text-lg" asChild>
                <Link to="/register">
                  Start your journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Value Props Section */}
        <div className="border-t border-primary-200">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            
            {/* Work Management */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Briefcase className="h-6 w-6 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Never lose your work</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Secure your professional legacy. Every project, document, and achievement 
                    is organized and accessible whenever you need it.
                  </p>
                  <p className="text-gray-500">
                    No more scattered files, forgotten achievements, or lost project history.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/never-lose-work.png"
                    alt="InChronicle application showing how professionals never lose their work and achievements"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Work Updates */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/stay-in-sync.png"
                    alt="InChronicle dashboard showing real-time project visibility and team synchronization"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Eye className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Stay in sync</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Real-time visibility into what matters. Track progress across all your projects 
                    and teams without endless status meetings.
                  </p>
                  <p className="text-gray-500">
                    Skip the status meetings. See what's happening when it's happening.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Management */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Lead with insight</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Data-driven team leadership. Understand team performance, identify wins, 
                    and spot improvement opportunities with clear insights.
                  </p>
                  <p className="text-gray-500">
                    Make decisions based on actual progress and outcomes, not assumptions.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/lead-with-insight.png"
                    alt="InChronicle analytics and insights dashboard for data-driven team leadership"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/build-relationships.png"
                    alt="InChronicle networking interface for building meaningful professional relationships"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Build real relationships</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Professional relationships that matter. Connect based on shared work, 
                    skills, and achievements—not just exaggerated profiles and CVs.
                  </p>
                  <p className="text-gray-500">
                    Move beyond surface-level networking to meaningful professional connections.
                  </p>
                </div>
              </div>
            </div>

            {/* Credible Identity */}
            <div className="bg-primary-500 rounded-2xl overflow-hidden">
              {/* Title spanning full width */}
              <div className="p-12 lg:px-16 lg:pt-16 lg:pb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Credible professional identity</h2>
                </div>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-0 items-start">
                {/* Left Content */}
                <div className="px-12 lg:px-16 pb-12 lg:pb-16">
                  <p className="text-lg text-white/90 leading-relaxed mb-6">
                    Verifiable professional credentials. Showcase real work and achievements 
                    that employers and collaborators can actually validate.
                  </p>
                  <p className="text-white/70 mb-8">
                    Beyond resumes. Beyond claims. Real, validated professional evidence.
                  </p>
                  
                  {/* Feature highlights */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="p-1 bg-white/20 rounded">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Peer verified achievements</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="p-1 bg-white/20 rounded">
                        <Award className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Employer-validated credentials</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="p-1 bg-white/20 rounded">
                        <Verified className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Skills accumulated through real-time journals over years</span>
                    </div>
                  </div>
                </div>
                
                {/* Right Visual */}
                <div className="relative h-full min-h-96">
                  <img
                    src="/screenshots/credible-identity.png"
                    alt="InChronicle credible professional identity with verified achievements and credentials"
                    className="rounded-xl shadow-lg w-full h-96 object-cover"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-50 py-24 border-t border-primary-100">
          <div className="mx-auto max-w-4xl text-center px-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to secure your professional legacy?
            </h2>
            <p className="text-lg text-primary-700 mb-8 font-medium">
              Join professionals who are already building validated, meaningful career stories.
            </p>
            <Button size="lg" className="px-8 py-4 text-lg shadow-lg" asChild>
              <Link to="/register">
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link to="/privacy" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-gray-500">
              Terms of Service
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2025 InChronicle. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}