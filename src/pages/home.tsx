import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, BookMarked, Building2, UserCircle2 } from 'lucide-react';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative isolate overflow-hidden bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
            <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
              <div className="mt-24 sm:mt-32 lg:mt-16">
                <a href="#" className="inline-flex space-x-6">
                  <span className="rounded-full bg-primary-500/10 px-3 py-1 text-sm font-semibold leading-6 text-primary-500 ring-1 ring-inset ring-primary-500/20">
                    Latest updates
                  </span>
                </a>
              </div>
              <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Document your professional journey
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                InChronicle helps organizations and professionals document their work, validate achievements, and create sanitized professional profiles for career advancement.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/about">Learn more</Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
              <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                <img
                  src="https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2940&auto=format&fit=crop"
                  alt="App screenshot"
                  width={2432}
                  height={1442}
                  className="w-[76rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-primary-500">Track Progress</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need to manage your career
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                From daily achievements to career milestones, InChronicle provides the tools you need to document and showcase your professional growth.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <BookMarked className="h-5 w-5 flex-none text-primary-500" />
                    Journal Entries
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Document your daily work, projects, and achievements in a secure and organized manner.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <Building2 className="h-5 w-5 flex-none text-primary-500" />
                    Organization Management
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Manage your organization's talent, validate achievements, and track professional growth.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <UserCircle2 className="h-5 w-5 flex-none text-primary-500" />
                    Professional Profiles
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Create and maintain sanitized professional profiles that highlight your validated achievements.</p>
                  </dd>
                </div>
              </dl>
            </div>
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