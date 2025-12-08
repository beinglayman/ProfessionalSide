import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, Megaphone, BadgeCheck, DoorOpen, CalendarCheck, Users, Plug, Sparkles, ShieldCheck, Brain, Download } from 'lucide-react';
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
              <span className="text-primary-600">We will make sure it's heard.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl text-center mx-auto leading-relaxed mt-4 mb-12">
              From conversations to commits to completed projects - InChronicle automatically captures your work wherever it happens and shapes it into your career story.
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
            
            {/* VP1: Let your work tell the story */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Megaphone className="h-6 w-6 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Let your work tell the story</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Noise gets rewarded. Quiet excellence gets overlooked. It's no longer enough to do great work - you have to market it too. But self-promotion diverts you from your core focus. It's the second job you didn't sign up for. InChronicle changes this - effortlessly capturing your work through connected workspace tools. You do the work, we'll make sure it's seen.
                  </p>
                  <p className="text-gray-500">
                    Back to doing what you were hired for.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/never-lose-work.png"
                    alt="InChronicle automatically captures your work so you can focus on what matters"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* VP2: Built on evidence, not claims */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/stay-in-sync.png"
                    alt="InChronicle grounds your professional story in real work activities"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BadgeCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Built on evidence, not claims</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    "Led cross-functional initiatives." "Drove 143% growth." Every profile claims this. How many have you seen actually deliver? InChronicle grounds your story in real work: conversations, collaborations, commits, documentation, completed projects, kudos, achievements, professional celebrations - validated by professionals you work with. Your professional narrative builds itself from what you actually do, not what you claim.
                  </p>
                  <p className="text-gray-500">
                    Credible by design.
                  </p>
                </div>
              </div>
            </div>

            {/* VP3: Your work opens doors */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <DoorOpen className="h-6 w-6 text-orange-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Your work opens doors</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Has getting shortlisted become impossible lately? That's because each job posting drowns in hundreds of AI-crafted applications - optimized for the ATS, tailored to the job description. The irony: professionals doing great work don't have time to customize applications for every role. The system is rigged against the right candidates because they're busy doing the work, while it rewards full-time job seekers. InChronicle flips this - matching you to jobs and connections based on your work, not your profile-crafting skills.
                  </p>
                  <p className="text-gray-500">
                    No more application games.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src="/screenshots/lead-with-insight.png"
                    alt="InChronicle matches you to opportunities based on your actual work"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
              </div>
            </div>

            {/* VP4: Don't leave reviews to chance */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/build-relationships.png"
                    alt="InChronicle keeps you review-ready with a complete record of your contributions"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CalendarCheck className="h-6 w-6 text-purple-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Don't leave reviews to chance</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Remember that project you crushed six months ago? Your reviewer might not. That's recency bias - what happened last month weighs heavier than what you delivered all year. Don't leave your performance review to chance. InChronicle always keeps you review-ready, capturing every win, kudos, and milestone as you work - so you can focus on your work.
                  </p>
                  <p className="text-gray-500">
                    You do the work. We build the BRAG.
                  </p>
                </div>
              </div>
            </div>

            {/* VP5: Your professional network, curated by work */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="/screenshots/credible-identity.png"
                    alt="InChronicle professional network curated by shared work and meaningful connections"
                    className="rounded-xl shadow-lg w-full h-80 object-cover object-left"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Your professional network, curated by work</h2>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    5,000+ connections. Zero relevance. A feed that distracts rather than inspires - cluttered with updates from people you connected with because declining a connection request felt rude. InChronicle helps you get noticed based on shared work. With a 300-connection limit, every connection is intentional and mindful.
                  </p>
                  <p className="text-gray-500">
                    Connections that compound, not clutter.
                  </p>
                </div>
              </div>
            </div>

            {/* Why professionals love InChronicle */}
            <div className="bg-primary-500 rounded-2xl overflow-hidden">
              <div className="p-12 lg:px-16 lg:py-16 text-center">
                <h2 className="text-3xl font-bold text-white mb-12">Why professionals love InChronicle</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Plug className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Integrations with work tools you already use</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Auto-generated journal drafts, ready for review when you are</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Privacy by design - data from your work tools is never stored</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">AI finds patterns to correlate activities, projects, and achievements across tools</span>
                  </div>

                  <div className="flex flex-col items-center text-center col-span-2 md:col-span-1">
                    <div className="p-3 bg-white/20 rounded-xl mb-4">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Export to BRAG, PDF, CSV, JSON anytime</span>
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