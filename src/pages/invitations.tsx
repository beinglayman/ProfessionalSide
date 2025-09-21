import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { InvitationService, InvitationQuota, InvitationStats, Invitation } from '../services/invitation.service';

export function InvitationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [quota, setQuota] = useState<InvitationQuota | null>(null);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Form states
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadInvitationData();
  }, []);

  const loadInvitationData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await InvitationService.getInvitationQuota();
      if (response.success && response.data) {
        setQuota(response.data.quota);
        setStats(response.data.stats);
      }

      const historyResponse = await InvitationService.getInvitationHistory();
      if (historyResponse.success && historyResponse.data) {
        setInvitations(historyResponse.data.invitations);
      }
    } catch (error: any) {
      console.error('Failed to load invitation data:', error);
      setError('Failed to load invitation data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (quota && quota.remaining <= 0) {
      setError('You have no remaining invitations. Your quota will be replenished on the 1st of next month.');
      return;
    }

    try {
      setIsSending(true);
      setError('');
      setSuccess('');

      const response = await InvitationService.createInvitation(email.trim(), message.trim() || undefined);
      
      if (response.success) {
        setSuccess(`Invitation sent successfully to ${email}!`);
        setEmail('');
        setMessage('');
        // Refresh data to show updated quota and history
        await loadInvitationData();
      } else {
        setError(response.error || 'Failed to send invitation. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      setError(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserPlus className="h-8 w-8 text-primary-600 mr-3" />
                My Invitations
              </h1>
              <p className="mt-2 text-gray-600">
                Invite colleagues to join InChronicle and track your invitation history
              </p>
            </div>
            <Button onClick={loadInvitationData} variant="outline" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Quota & Send Invitation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quota Card */}
            {quota && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Invitation Quota</h2>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600">
                    {quota.isAdmin ? '∞' : quota.remaining}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {quota.isAdmin ? 'Unlimited (Admin)' : 'invitations remaining'}
                  </div>
                  {!quota.isAdmin && (
                    <div className="mt-4 text-xs text-gray-500">
                      <div className="flex items-center justify-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Quota replenishes on the 1st of each month</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Statistics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Sent</span>
                    <span className="font-medium">{stats.totalSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Accepted</span>
                    <span className="font-medium text-green-600">{stats.totalAccepted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-medium text-yellow-600">{stats.totalPending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expired</span>
                    <span className="font-medium text-red-600">{stats.totalExpired}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Send Invitation Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Send Invitation</h2>
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    disabled={isSending || (quota && !quota.isAdmin && quota.remaining <= 0)}
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Personal Message (optional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a personal note to your invitation..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    disabled={isSending}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSending || (quota && !quota.isAdmin && quota.remaining <= 0)}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>

                {quota && !quota.isAdmin && quota.remaining <= 0 && (
                  <p className="text-sm text-amber-600 text-center">
                    No invitations remaining. Your quota will replenish next month.
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Right Column: Invitation History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Invitation History</h2>
                <p className="text-sm text-gray-600">Track the status of your sent invitations</p>
              </div>

              {invitations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>No invitations sent yet.</p>
                  <p className="text-sm">Send your first invitation to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(invitation.status)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {invitation.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                Sent {new Date(invitation.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {invitation.status === 'accepted' && invitation.acceptedAt && (
                            <div className="mt-2 text-xs text-green-600">
                              Accepted on {new Date(invitation.acceptedAt).toLocaleDateString()}
                            </div>
                          )}
                          
                          {invitation.status === 'expired' && (
                            <div className="mt-2 text-xs text-red-600">
                              Expired on {new Date(invitation.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                            {invitation.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}