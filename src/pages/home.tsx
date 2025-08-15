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
              Work speaks louder here.
              <br />
              <span className="text-primary-600">Chronicle your professional journey.</span>
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
                    src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=2939&auto=format&fit=crop"
                    alt="Organized workspace with documents and files"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-primary-600/10 rounded-xl"></div>
                </div>
              </div>
            </div>

            {/* Work Updates */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2940&auto=format&fit=crop"
                    alt="Real-time dashboard showing project progress"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-green-600/10 rounded-xl"></div>
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
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2815&auto=format&fit=crop"
                    alt="Analytics dashboard showing team performance metrics"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-orange-600/10 rounded-xl"></div>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                  <img
                    src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=2940&auto=format&fit=crop"
                    alt="Professional team collaboration and networking"
                    className="rounded-xl shadow-lg w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-purple-600/10 rounded-xl"></div>
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
                      <span className="text-sm font-medium">Blockchain-verified achievements</span>
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
                      <span className="text-sm font-medium">Peer-endorsed skills</span>
                    </div>
                  </div>
                </div>
                
                {/* Right Visual */}
                <div className="relative h-full min-h-96 bg-primary-600/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/20"></div>
                  <div className="relative h-full flex items-center justify-center p-8">
                    
                    {/* Profile mockup */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full shadow-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-bold text-lg">JD</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Jane Developer</h3>
                          <p className="text-sm text-gray-600">Senior Software Engineer</p>
                        </div>
                      </div>
                      
                      {/* Verified badges */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">React Expert</span>
                          </div>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Verified</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Led 5 Projects</span>
                          </div>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Verified</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Team Lead</span>
                          </div>
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Verified</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                          ✓ Validated by TechCorp Inc. & 12 colleagues
                        </p>
                      </div>
                    </div>
                    
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