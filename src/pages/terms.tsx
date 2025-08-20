import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FileText, Shield, Users, Scale, Globe, ArrowLeft } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        {/* Header */}
        <div className="bg-primary-600 text-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-lg text-white/90">Effective Date: April 5, 2025</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-lg text-gray-600 mb-12">
              Welcome to InChronicle. These Terms of Service ("Terms") govern your access to and use of the InChronicle platform and services. By using InChronicle, you agree to these Terms.
            </p>

            <div className="space-y-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Shield className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">1. Account Registration</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">1.1 Account Creation</h3>
                    <p className="text-gray-600">
                      You must create an account to use most features of InChronicle. You agree to provide accurate, current, and complete information and to update this information to keep it accurate, current, and complete.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">1.2 Account Security</h3>
                    <p className="text-gray-600">
                      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use of your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">2. Core Services</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2.1 Professional Chronicle</h3>
                    <p className="text-gray-600">
                      InChronicle allows you to document your professional experiences, skills, and achievements in real-time and have them verified by colleagues and supervisors.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2.2 Verification Process</h3>
                    <p className="text-gray-600">
                      You may request verification from other users who can attest to your professional activities. Verifications are timestamped and cannot be backdated.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2.3 Profile Generation</h3>
                    <p className="text-gray-600">
                      You can create professional profiles and portfolios based on your verified experiences for sharing with potential employers or your network.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">3. User Responsibilities</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.1 Accurate Information</h3>
                    <p className="text-gray-600">
                      You agree to provide truthful and accurate information about your professional experiences, skills, and achievements.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.2 Verification Requests</h3>
                    <p className="text-gray-600">
                      You agree to only request verification from individuals who genuinely witnessed or can attest to your professional activities.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.3 Verification Responses</h3>
                    <p className="text-gray-600">
                      When verifying others' professional activities, you agree to provide honest assessments based on your firsthand knowledge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Scale className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">4. Legal Matters</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">4.1 Intellectual Property</h3>
                    <p className="text-gray-600">
                      The InChronicle platform, including its design, features, and content created by us, is protected by copyright, trademark, and other intellectual property laws.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">4.2 Your Content</h3>
                    <p className="text-gray-600">
                      You retain rights to the content you create on InChronicle, but grant us a license to use it for operating and improving our services.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">4.3 Termination</h3>
                    <p className="text-gray-600">
                      We may suspend or terminate your account for violations of these Terms, illegal activities, or if required by law.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Globe className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">5. Additional Terms</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">5.1 Service Provided "As Is"</h3>
                    <p className="text-gray-600">
                      InChronicle is provided on an "as is" and "as available" basis without warranties of any kind.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">5.2 Limitation of Liability</h3>
                    <p className="text-gray-600">
                      To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">5.3 Governing Law</h3>
                    <p className="text-gray-600">
                      These Terms are governed by the laws of Indian Jurisdiction, without regard to its conflict of law principles.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 rounded-xl p-8 border border-primary-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <p className="text-gray-600">
                  If you have questions about these Terms, please contact us at{' '}
                  <a href="mailto:hello@inchronicle.com" className="text-primary-600 hover:text-primary-700 font-medium">
                    hello@inchronicle.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
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