import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, BadgeCheck, DoorOpen, CalendarCheck, Users, Plug, Sparkles, ShieldCheck, Brain, Download } from 'lucide-react';
import { ToolIcon } from '../components/icons/ToolIcons';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* TODO: Unhide when we have real user count */}
            <div className="flex justify-end mb-8 hidden">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 border border-primary-200">
                Join X professionals
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl mt-16 mb-10">
              Let your work do the talking.
              <br />
              <span className="text-primary-600">We make sure it's heard.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl text-center mx-auto leading-relaxed mt-4 mb-12">
            In a world that rewards noise, quiet excellence often goes unnoticed. InChronicle connects to your daily work tools and transforms everyday contributions into a credible career story you can use across performance reviews and job applications.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700 border border-primary-200">
                <ToolIcon tool="github" size={18} />
                <ToolIcon tool="teams" size={18} />
                <ToolIcon tool="google_workspace" size={18} />
                <ToolIcon tool="jira" size={18} />
                <span className="ml-1">+ many more</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700 border border-primary-200">
                AI-powered
              </span>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700 border border-primary-200">
                Privacy-first
              </span>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700 border border-primary-200">
                Export-ready
              </span>
            </div>
            <div className="mt-12 flex items-center justify-center">
              <Button size="lg" className="px-8 py-4 text-lg" asChild>
                <Link to="/register">
                  Start your chronicle
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Value Props Section */}
        <div className="border-t border-primary-200">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            
            {/* VP1: Career happens when you're busy working */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <CalendarCheck className="h-6 w-6 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Every milestone counts</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  What happened last month shouldn’t outweigh a year of real impact. InChronicle captures every win, milestone, and kudos as you work - so your performance review is never left to chance.
                  </p>
                  <p className="text-gray-500">
                    You do the work. We build the BRAG.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/stay-in-sync.png"
                    alt="InChronicle keeps you review-ready with a complete record of your contributions"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
              </div>
            </div>

            {/* VP2: Show your work log, not stories */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/work-log-evidence.png"
                    alt="InChronicle grounds your professional story in real work activities"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-top"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BadgeCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Show your work, not stories</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    "Led cross-functional initiatives." Everyone claims this. Few can prove. InChronicle builds your professional story from real work—commits, completed projects, peer recognition. Validated by the people who were there.
                  </p>
                  <p className="text-gray-500">
                    Credible by design.
                  </p>
                </div>
              </div>
            </div>

            {/* VP3: Let your work open doors */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <DoorOpen className="h-6 w-6 text-orange-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Let your work open doors</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Does self-promotion seem like a second job you didn't sign up for? InChronicle helps you build a track record that speaks for itself—making it easier for the right roles and connections to find you.
                  </p>
                  <p className="text-gray-500">
                    Be discovered for what you do.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/lead-with-insight.png"
                    alt="InChronicle helps the right opportunities find you based on your actual work"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
              </div>
            </div>

            {/* Why professionals choose InChronicle */}
            <div className="bg-primary-500 rounded-2xl overflow-hidden">
              <div className="p-12 lg:px-16 lg:py-16 text-center">
                <h2 className="text-3xl font-bold text-white mb-12">Why professionals choose InChronicle</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Plug className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Connects to tools you already use</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">AI drafts entries — review and publish when ready</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Privacy-first — we process activity, not store it</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Finds patterns across your tools automatically</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Export your BRAG or Profile anytime</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Meaningful network with intentional connections</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-50 py-24 border-t border-primary-100">
          <div className="mx-auto max-w-4xl text-center px-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to build your career story?
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