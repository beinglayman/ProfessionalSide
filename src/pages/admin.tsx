import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Settings, 
  BarChart3, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Mail,
  AlertTriangle,
  Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { AdminService, AdminStats, InvitationRequest, UserSummary, SystemSettings } from '../services/admin.service';
import { useAuth } from '../contexts/AuthContext';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [invitationRequests, setInvitationRequests] = useState<InvitationRequest[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Load all admin data in parallel
      const [statsResponse, requestsResponse, usersResponse, settingsResponse] = await Promise.all([
        AdminService.getAdminStats(),
        AdminService.getInvitationRequests(1, 50),
        AdminService.getUsers(1, 50),
        AdminService.getSystemSettings()
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (requestsResponse.success && requestsResponse.data) {
        setInvitationRequests(requestsResponse.data.requests);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data.users);
      }

      if (settingsResponse.success && settingsResponse.data) {
        setSystemSettings(settingsResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      setError('Failed to load admin data. Please try again.');
      
      // If unauthorized, redirect to home
      if (error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewRequest = async (requestId: string, decision: 'approved' | 'denied', adminMessage?: string) => {
    try {
      const response = await AdminService.reviewInvitationRequest(requestId, decision, adminMessage);
      if (response.success) {
        // Refresh the requests
        await loadAdminData();
      }
    } catch (error) {
      console.error('Failed to review request:', error);
      setError('Failed to review request. Please try again.');
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<SystemSettings>) => {
    try {
      setIsUpdatingSettings(true);
      const response = await AdminService.updateSystemSettings(newSettings);
      if (response.success && response.data) {
        setSystemSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setError('Failed to update settings. Please try again.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTriggerReplenishment = async () => {
    try {
      const response = await AdminService.triggerQuotaReplenishment();
      if (response.success) {
        await loadAdminData(); // Refresh data
        alert(`Replenishment completed: ${response.data?.replenished} users replenished`);
      }
    } catch (error) {
      console.error('Failed to trigger replenishment:', error);
      setError('Failed to trigger replenishment. Please try again.');
    }
  };

  const tabs: TabProps[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: 'requests',
      label: 'Invitation Requests',
      icon: <Mail className="h-4 w-4" />,
      count: stats?.requests.totalPending || 0,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="h-4 w-4" />,
      count: stats?.users.totalUsers || 0,
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Shield className="h-8 w-8 text-primary-600 mr-3" />
                Admin Panel
              </h1>
              <p className="mt-2 text-gray-600">
                Manage invitations, review requests, and configure system settings
              </p>
            </div>
            <Button onClick={() => loadAdminData()} className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Data</span>
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && (
          <OverviewTab stats={stats} onTriggerReplenishment={handleTriggerReplenishment} />
        )}

        {activeTab === 'requests' && (
          <RequestsTab 
            requests={invitationRequests}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onReviewRequest={handleReviewRequest}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab 
            users={users}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {activeTab === 'settings' && systemSettings && (
          <SettingsTab 
            settings={systemSettings}
            isUpdating={isUpdatingSettings}
            onUpdateSettings={handleSettingsUpdate}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, onTriggerReplenishment }: { 
  stats: AdminStats; 
  onTriggerReplenishment: () => void; 
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Invitation Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invitations</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Sent</span>
            <span className="font-medium">{stats.invitations.totalSent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Accepted</span>
            <span className="font-medium text-green-600">{stats.invitations.totalAccepted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Pending</span>
            <span className="font-medium text-yellow-600">{stats.invitations.totalPending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Expired</span>
            <span className="font-medium text-red-600">{stats.invitations.totalExpired}</span>
          </div>
        </div>
      </div>

      {/* Request Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invitation Requests</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Pending Review</span>
            <span className="font-medium text-yellow-600">{stats.requests.totalPending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Approved</span>
            <span className="font-medium text-green-600">{stats.requests.totalApproved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Denied</span>
            <span className="font-medium text-red-600">{stats.requests.totalDenied}</span>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Users</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Users</span>
            <span className="font-medium">{stats.users.totalUsers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">With Quota</span>
            <span className="font-medium">{stats.users.totalWithQuota}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Remaining</span>
            <span className="font-medium">{stats.users.totalQuotaRemaining}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button 
            onClick={onTriggerReplenishment}
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Trigger Quota Replenishment
          </Button>
        </div>
      </div>
    </div>
  );
}

// Requests Tab Component
function RequestsTab({ 
  requests, 
  selectedStatus, 
  onStatusChange, 
  onReviewRequest 
}: {
  requests: InvitationRequest[];
  selectedStatus: string;
  onStatusChange: (status: 'all' | 'pending' | 'approved' | 'denied') => void;
  onReviewRequest: (id: string, decision: 'approved' | 'denied', message?: string) => void;
}) {
  const filteredRequests = requests.filter(request => 
    selectedStatus === 'all' || request.status === selectedStatus
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        <select 
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No invitation requests found.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <RequestCard 
                key={request.id} 
                request={request} 
                onReview={onReviewRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Request Card
function RequestCard({ 
  request, 
  onReview 
}: { 
  request: InvitationRequest; 
  onReview: (id: string, decision: 'approved' | 'denied', message?: string) => void; 
}) {
  const [adminMessage, setAdminMessage] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async (decision: 'approved' | 'denied') => {
    try {
      setIsReviewing(true);
      await onReview(request.id, decision, adminMessage.trim() || undefined);
      setAdminMessage('');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <h3 className="text-lg font-medium text-gray-900">{request.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              request.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-800'
                : request.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {request.status}
            </span>
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p><strong>Email:</strong> {request.email}</p>
            <p><strong>Role:</strong> {request.role}</p>
            <p><strong>Organization:</strong> {request.organization}</p>
            {request.linkedinUrl && (
              <p><strong>LinkedIn:</strong> 
                <a href={request.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500 ml-1">
                  {request.linkedinUrl}
                </a>
              </p>
            )}
            <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
            {request.message && (
              <div className="mt-2">
                <strong>Message:</strong>
                <p className="mt-1 p-2 bg-gray-50 rounded text-gray-700">{request.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions for pending requests */}
        {request.status === 'pending' && (
          <div className="ml-6 space-y-3">
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Optional admin message..."
              className="w-64 p-2 border border-gray-300 rounded-md text-sm"
              rows={3}
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => handleReview('approved')}
                disabled={isReviewing}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                onClick={() => handleReview('denied')}
                disabled={isReviewing}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </div>
          </div>
        )}

        {/* Review info for processed requests */}
        {request.status !== 'pending' && request.reviewedBy && (
          <div className="ml-6 text-sm text-gray-600">
            <p><strong>Reviewed by:</strong> {request.reviewedBy.name}</p>
            <p><strong>Date:</strong> {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : 'N/A'}</p>
            {request.adminMessage && (
              <div className="mt-2">
                <strong>Admin message:</strong>
                <p className="mt-1 p-2 bg-gray-50 rounded">{request.adminMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ 
  users, 
  searchTerm, 
  onSearchChange 
}: {
  users: UserSummary[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}) {
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invitations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.invitationQuotaRemaining} / {user.invitationQuotaTotal}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isAdmin ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      User
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ 
  settings, 
  isUpdating, 
  onUpdateSettings 
}: {
  settings: SystemSettings;
  isUpdating: boolean;
  onUpdateSettings: (settings: Partial<SystemSettings>) => void;
}) {
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
          <p className="mt-1 text-sm text-gray-600">
            Configure global system behavior for invitations and user registration.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="invitationOnlyMode"
              type="checkbox"
              checked={formData.invitationOnlyMode}
              onChange={(e) => setFormData({ ...formData, invitationOnlyMode: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="invitationOnlyMode" className="ml-2 block text-sm text-gray-900">
              Invitation-only mode
            </label>
          </div>
          <p className="text-sm text-gray-500 ml-6">
            When enabled, users can only register with a valid invitation token.
          </p>

          <div className="flex items-center">
            <input
              id="invitationRequestsEnabled"
              type="checkbox"
              checked={formData.invitationRequestsEnabled}
              onChange={(e) => setFormData({ ...formData, invitationRequestsEnabled: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="invitationRequestsEnabled" className="ml-2 block text-sm text-gray-900">
              Allow invitation requests
            </label>
          </div>
          <p className="text-sm text-gray-500 ml-6">
            When enabled, users can submit requests for invitations through the public form.
          </p>

          <div>
            <label htmlFor="defaultInvitationQuota" className="block text-sm font-medium text-gray-700">
              Default invitation quota
            </label>
            <input
              id="defaultInvitationQuota"
              type="number"
              min="1"
              max="100"
              value={formData.defaultInvitationQuota}
              onChange={(e) => setFormData({ ...formData, defaultInvitationQuota: parseInt(e.target.value) })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Number of invitations given to new users each month.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}