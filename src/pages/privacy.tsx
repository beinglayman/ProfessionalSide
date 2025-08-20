import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Shield, Lock, Globe, FileCheck, Users, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
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
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-lg text-white/90">Effective Date: April 5, 2025</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-lg text-gray-600 mb-12">
              At InChronicle, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>

            <div className="space-y-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Shield className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Name, email address, and contact details</li>
                      <li>Professional information you choose to share</li>
                      <li>Employment history and educational background</li>
                      <li>Skills, certifications, and achievements</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Verification Information</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Identity of verifiers</li>
                      <li>Verification timestamps and signatures</li>
                      <li>Comments and endorsements from verifiers</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Usage Information</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Log data and device information</li>
                      <li>How you interact with our platform</li>
                      <li>Features and pages you access</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Lock className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Core Services</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Creating and maintaining your professional chronicle</li>
                      <li>Facilitating verification processes</li>
                      <li>Generating professional profiles and portfolios</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Service Improvement</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Analyzing usage patterns to enhance our platform</li>
                      <li>Developing new features and capabilities</li>
                      <li>Troubleshooting issues and optimizing performance</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Communication</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Sending verification requests and notifications</li>
                      <li>Providing updates about our services</li>
                      <li>Responding to your inquiries and requests</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Globe className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Information Sharing</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">With Your Consent</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Sharing with potential employers when you choose</li>
                      <li>Displaying information to verifiers you select</li>
                      <li>Publishing profiles according to your privacy settings</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Service Providers</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Cloud hosting and storage providers</li>
                      <li>Analytics and performance monitoring services</li>
                      <li>Customer support tools</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Legal Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Complying with applicable laws and regulations</li>
                      <li>Responding to valid legal requests</li>
                      <li>Protecting our rights and preventing misuse</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Rights and Choices</h2>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Access and download your information</li>
                  <li>Update or correct inaccurate data</li>
                  <li>Control privacy settings and sharing preferences</li>
                  <li>Request deletion of your account and data</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <FileCheck className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Additional Information</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Data Security</h3>
                    <p className="text-gray-600">
                      We implement appropriate technical and organizational measures to protect your information, including encryption, access controls, and regular security assessments.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">International Data Transfers</h3>
                    <p className="text-gray-600">
                      Your information may be transferred to and processed in countries other than your country of residence, where data protection laws may differ.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Children's Privacy</h3>
                    <p className="text-gray-600">
                      Our services are not directed to individuals under 16. We do not knowingly collect personal information from children.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Changes to This Policy</h3>
                    <p className="text-gray-600">
                      We may update this Privacy Policy periodically. We will notify you of significant changes through our platform or via email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 rounded-xl p-8 border border-primary-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-600">
                  If you have questions about this Privacy Policy or our privacy practices, please contact our Data Protection Officer at{' '}
                  <a href="mailto:privacy@inchronicle.com" className="text-primary-600 hover:text-primary-700 font-medium">
                    privacy@inchronicle.com
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