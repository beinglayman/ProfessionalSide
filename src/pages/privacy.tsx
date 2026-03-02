import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Globe, FileCheck, Users, ArrowLeft, Cloud } from 'lucide-react';

function IntegrationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-primary-100 rounded-lg mr-3">
          <Cloud className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

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
            <p className="text-lg text-white/90">Effective Date: March 2, 2026</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-lg text-gray-600 mb-12">
              At InChronicle, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>

            <div className="space-y-12">
              {/* Information We Collect */}
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
                    <h3 className="font-semibold text-gray-900 mb-2">Third-Party Integrations</h3>
                    <p className="text-gray-600 mb-2">
                      When you choose to connect external tools (such as Google Workspace, Microsoft 365, GitHub, or Atlassian), we access specific data from those services to help build your professional chronicle. The exact data accessed, how it is used, stored, and protected is described in detail in the dedicated sections below for each provider.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Usage Information</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Log data and device information</li>
                      <li>How you interact with our platform</li>
                      <li>Features and pages you access</li>
                      <li>Session recordings and interaction heatmaps (via Microsoft Clarity)</li>
                      <li>Anonymized user behavior analytics to improve user experience</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Analytics Information</h3>
                    <p className="text-gray-600 mb-2">
                      We use Microsoft Clarity to understand how visitors interact with our website.
                      Clarity collects information such as:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Mouse movements, clicks, and scrolling behavior</li>
                      <li>Session recordings (with sensitive data masked)</li>
                      <li>Device and browser information</li>
                      <li>Pages visited and time spent on each page</li>
                    </ul>
                    <p className="text-gray-600 mt-2">
                      All data collected through Microsoft Clarity is anonymized and used solely to improve
                      the user experience. For more information, see{' '}
                      <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                        Microsoft's Privacy Policy
                      </a>.
                    </p>
                  </div>
                </div>
              </div>

              {/* How We Use Your Information */}
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

              {/* Information Sharing */}
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
                      <li>Cloud hosting and storage providers (Microsoft Azure)</li>
                      <li>Analytics and performance monitoring services (Microsoft Clarity)</li>
                      <li>Customer support tools</li>
                    </ul>
                    <p className="text-gray-600 mt-2">
                      When you connect third-party integrations (Google Workspace, Microsoft 365, GitHub, Atlassian), we access data from those providers solely to deliver InChronicle's services. We do not share the data obtained from these providers with any other third party. See the dedicated integration sections below for full details.
                    </p>
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

              {/* ===== THIRD-PARTY INTEGRATION SECTIONS ===== */}

              {/* Google Workspace */}
              <IntegrationSection title="Google Workspace Data">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Accessed</h3>
                  <p className="text-gray-600 mb-2">
                    When you connect your Google account, InChronicle requests read-only access to the following data:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Google account profile information (name, email address, profile photo)</li>
                    <li>Google Drive file metadata (file names, types, timestamps, sharing status). We do not access file contents.</li>
                    <li>Google Calendar event metadata (event titles, start/end times, attendee names)</li>
                    <li>Google Meet recording metadata (recording names, dates, durations — identified via Drive)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Usage</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Display your recent professional activity within InChronicle to help build your career chronicle</li>
                    <li>Generate AI-assisted career story suggestions based on your work patterns</li>
                    <li>All processing happens in real-time during your active session</li>
                    <li>Your Google data is not used for advertising, profiling, or any purpose unrelated to InChronicle's core service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Sharing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Your Google user data is not shared with any third parties</li>
                    <li>It is not sold, rented, or disclosed to advertisers or data brokers</li>
                    <li>It is not used for AI/ML model training beyond your own session</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Storage & Protection</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Google user data is not stored in our database — it is fetched on-demand and held in memory-only sessions</li>
                    <li>Sessions automatically expire after 30 minutes, after which all fetched data is permanently cleared</li>
                    <li>OAuth authentication tokens are encrypted at rest using AES-256 encryption</li>
                    <li>All communication with Google APIs is conducted over HTTPS/TLS</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Retention & Deletion</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Activity data: No retention — cleared automatically after the 30-minute session expires</li>
                    <li>OAuth tokens: Retained only while the Google integration remains connected</li>
                    <li>You can disconnect Google at any time from Settings &rarr; Integrations. Disconnecting revokes and deletes your tokens.</li>
                    <li>You can delete your entire InChronicle account from Settings &rarr; Privacy, which removes all integration data</li>

                  </ul>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  OAuth scopes requested: <code className="bg-gray-100 px-1 rounded text-xs">userinfo.email</code>, <code className="bg-gray-100 px-1 rounded text-xs">userinfo.profile</code>, <code className="bg-gray-100 px-1 rounded text-xs">drive.readonly</code>, <code className="bg-gray-100 px-1 rounded text-xs">calendar.readonly</code>
                </p>
              </IntegrationSection>

              {/* Microsoft */}
              <IntegrationSection title="Microsoft Data (Outlook, Teams, OneDrive, OneNote)">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Accessed</h3>
                  <p className="text-gray-600 mb-2">
                    When you connect your Microsoft account, InChronicle requests read-only access to the following data:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Microsoft account profile information (name, email)</li>
                    <li>Outlook: calendar meetings (subject, times, attendees) and emails (subject, sender, date, body preview)</li>
                    <li>Teams: joined teams, channels, and chat messages (content, timestamps, participants)</li>
                    <li>OneDrive: recent and shared file metadata (file names, types, timestamps). We do not access file contents.</li>
                    <li>OneNote: notebook and section metadata, page titles and content previews</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Usage</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Display your recent professional activity within InChronicle to help build your career chronicle</li>
                    <li>Generate AI-assisted career story suggestions based on your work patterns</li>
                    <li>All processing happens in real-time during your active session</li>
                    <li>Your Microsoft data is not used for advertising, profiling, or any purpose unrelated to InChronicle's core service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Sharing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Your Microsoft user data is not shared with any third parties</li>
                    <li>It is not sold, rented, or disclosed to advertisers or data brokers</li>
                    <li>It is not used for AI/ML model training beyond your own session</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Storage & Protection</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Microsoft user data is not stored in our database — it is fetched on-demand and held in memory-only sessions</li>
                    <li>Sessions automatically expire after 30 minutes, after which all fetched data is permanently cleared</li>
                    <li>Teams message content is scanned and stripped of any embedded secrets (API keys, tokens) before processing</li>
                    <li>OAuth authentication tokens are encrypted at rest using AES-256 encryption</li>
                    <li>All communication with Microsoft Graph APIs is conducted over HTTPS/TLS</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Retention & Deletion</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Activity data: No retention — cleared automatically after the 30-minute session expires</li>
                    <li>OAuth tokens: Retained only while the Microsoft integration remains connected</li>
                    <li>You can disconnect Microsoft services at any time from Settings &rarr; Integrations. Disconnecting revokes and deletes your tokens.</li>
                    <li>You can delete your entire InChronicle account from Settings &rarr; Privacy, which removes all integration data</li>

                  </ul>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  OAuth scopes requested — Outlook: <code className="bg-gray-100 px-1 rounded text-xs">User.Read</code>, <code className="bg-gray-100 px-1 rounded text-xs">Mail.Read</code>, <code className="bg-gray-100 px-1 rounded text-xs">Calendars.Read</code>. Teams: <code className="bg-gray-100 px-1 rounded text-xs">Team.ReadBasic.All</code>, <code className="bg-gray-100 px-1 rounded text-xs">Channel.ReadBasic.All</code>, <code className="bg-gray-100 px-1 rounded text-xs">Chat.Read</code>. OneDrive: <code className="bg-gray-100 px-1 rounded text-xs">Files.Read</code>. OneNote: <code className="bg-gray-100 px-1 rounded text-xs">Notes.Read</code>.
                </p>
              </IntegrationSection>

              {/* GitHub */}
              <IntegrationSection title="GitHub Data">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Accessed</h3>
                  <p className="text-gray-600 mb-2">
                    When you connect your GitHub account, InChronicle accesses the following data:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>GitHub profile information (username, name, email)</li>
                    <li>Repository metadata (names, languages, stars, descriptions)</li>
                    <li>Commit history (messages, timestamps, additions/deletions statistics)</li>
                    <li>Pull requests (titles, status, descriptions, review information)</li>
                    <li>Issues (titles, status, labels, comment counts)</li>
                    <li>Releases, CI/CD workflow runs, deployments, and review comments</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Usage</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Display your development activity within InChronicle to help build your career chronicle</li>
                    <li>Generate AI-assisted career story suggestions based on coding and collaboration patterns</li>
                    <li>Detect cross-tool references (e.g., linking pull requests to Jira tickets) for richer activity context</li>
                    <li>Your GitHub data is not used for advertising, profiling, or any purpose unrelated to InChronicle's core service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Sharing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Your GitHub user data is not shared with any third parties</li>
                    <li>It is not sold, rented, or disclosed to advertisers or data brokers</li>
                    <li>It is not used for AI/ML model training beyond your own session</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Storage & Protection</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>GitHub user data is not stored in our database — it is fetched on-demand and held in memory-only sessions</li>
                    <li>Sessions automatically expire after 30 minutes, after which all fetched data is permanently cleared</li>
                    <li>OAuth authentication tokens are encrypted at rest using AES-256 encryption</li>
                    <li>All communication with GitHub APIs is conducted over HTTPS/TLS</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Retention & Deletion</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Activity data: No retention — cleared automatically after the 30-minute session expires</li>
                    <li>OAuth tokens: Retained only while the GitHub integration remains connected</li>
                    <li>You can disconnect GitHub at any time from Settings &rarr; Integrations. Disconnecting revokes and deletes your tokens.</li>
                    <li>You can delete your entire InChronicle account from Settings &rarr; Privacy, which removes all integration data</li>

                  </ul>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  OAuth scopes requested: <code className="bg-gray-100 px-1 rounded text-xs">repo</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:user</code>
                </p>
              </IntegrationSection>

              {/* Atlassian (Jira & Confluence) */}
              <IntegrationSection title="Atlassian Data (Jira & Confluence)">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Accessed</h3>
                  <p className="text-gray-600 mb-2">
                    When you connect your Atlassian account, InChronicle requests read-only access to the following data:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Atlassian account profile information (name, email)</li>
                    <li>Jira: issues (keys, summaries, status, assignees, reporters), projects, sprints, changelogs, worklogs, and versions/releases</li>
                    <li>Confluence: pages, blog posts, comments, and spaces — including content previews</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Usage</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Display your project management and documentation activity within InChronicle to help build your career chronicle</li>
                    <li>Generate AI-assisted career story suggestions based on project contributions</li>
                    <li>Detect cross-tool references (e.g., linking Jira tickets to GitHub pull requests) for richer activity context</li>
                    <li>Your Atlassian data is not used for advertising, profiling, or any purpose unrelated to InChronicle's core service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Sharing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Your Atlassian user data is not shared with any third parties</li>
                    <li>It is not sold, rented, or disclosed to advertisers or data brokers</li>
                    <li>It is not used for AI/ML model training beyond your own session</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Storage & Protection</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Atlassian user data is not stored in our database — it is fetched on-demand and held in memory-only sessions</li>
                    <li>Sessions automatically expire after 30 minutes, after which all fetched data is permanently cleared</li>
                    <li>OAuth authentication tokens are encrypted at rest using AES-256 encryption</li>
                    <li>All communication with Atlassian APIs is conducted over HTTPS/TLS</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Retention & Deletion</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Activity data: No retention — cleared automatically after the 30-minute session expires</li>
                    <li>OAuth tokens: Retained only while the Atlassian integration remains connected</li>
                    <li>You can disconnect Jira or Confluence at any time from Settings &rarr; Integrations. Disconnecting revokes and deletes your tokens.</li>
                    <li>You can delete your entire InChronicle account from Settings &rarr; Privacy, which removes all integration data</li>

                  </ul>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  OAuth scopes requested — Jira: <code className="bg-gray-100 px-1 rounded text-xs">read:jira-work</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:jira-user</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:board-scope:jira-software</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:sprint:jira-software</code>. Confluence: <code className="bg-gray-100 px-1 rounded text-xs">read:page:confluence</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:blogpost:confluence</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:space:confluence</code>, <code className="bg-gray-100 px-1 rounded text-xs">read:comment:confluence</code>.
                </p>
              </IntegrationSection>

              {/* ===== END INTEGRATION SECTIONS ===== */}

              {/* Your Rights and Choices */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Rights and Choices</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Data Access & Control</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Access and download your information at any time from Settings &rarr; Privacy</li>
                      <li>Update or correct inaccurate data</li>
                      <li>Control privacy settings and sharing preferences</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Integration Management</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Connect or disconnect any third-party integration at any time from Settings &rarr; Integrations</li>
                      <li>Disconnecting an integration immediately revokes access and deletes stored tokens</li>
                      <li>Data fetched from integrations is never persisted — it exists only in temporary 30-minute sessions</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Data Retention & Deletion</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Third-party integration data: No retention — cleared after 30-minute session expiry</li>
                      <li>Audit logs: Retained for 90 days, then automatically deleted</li>
                      <li>Data exports: Available for 24 hours, then automatically deleted</li>
                      <li>Request complete account deletion from Settings &rarr; Privacy, which permanently removes your profile, all integration data, and associated records</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
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

              {/* Contact */}
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
              &copy; 2026 InChronicle. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
