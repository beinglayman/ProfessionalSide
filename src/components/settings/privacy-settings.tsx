import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Shield, 
  FileText, 
  AlertTriangle, 
  Lock, 
  Eye,
  EyeOff,
  Globe,
  Users,
  User,
  Check,
  X,
  ChevronRight,
  Database,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  useRequestDataExport, 
  useDownloadExportData, 
  useDeleteProfile,
  useCheckExportStatus 
} from '../../hooks/useDataPrivacy';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  confirmButtonClass?: string;
  requiresTyping?: boolean;
  requiredText?: string;
  isLoading?: boolean;
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText, 
  confirmButtonClass = "bg-red-600 hover:bg-red-700",
  requiresTyping = false,
  requiredText = "",
  isLoading = false
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('');
  const [agreed, setAgreed] = useState(false);
  
  const canConfirm = requiresTyping ? 
    (typedText === requiredText && agreed) : 
    agreed;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          
          <p className="text-gray-600 mb-6">{description}</p>
          
          {requiresTyping && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "{requiredText}" to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={requiredText}
              />
            </div>
          )}
          
          <div className="flex items-start space-x-2 mb-6">
            <input
              type="checkbox"
              id="confirm-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="confirm-checkbox" className="text-sm text-gray-700">
              I understand this action cannot be undone and I want to proceed
            </label>
          </div>
          
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!canConfirm || isLoading}
              className={confirmButtonClass}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrivacySettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  dangerous?: boolean;
}

function PrivacySetting({ icon, title, description, action, dangerous = false }: PrivacySettingProps) {
  return (
    <div className={cn(
      'flex items-start justify-between p-6 rounded-lg border transition-colors',
      dangerous ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
    )}>
      <div className="flex items-start space-x-4 flex-1">
        <div className={cn(
          'p-2 rounded-lg',
          dangerous ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0 ml-6">
        {action}
      </div>
    </div>
  );
}

export function PrivacySettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // API hooks
  const requestExport = useRequestDataExport();
  const downloadExport = useDownloadExportData();
  const checkExportStatus = useCheckExportStatus();
  const deleteProfile = useDeleteProfile();

  const handleDownloadData = async () => {
    if (!user) return;
    
    try {
      toast.info('Preparing your data export. This may take a few minutes...');
      
      // Request data export
      const exportResponse = await requestExport.mutateAsync();
      
      if (exportResponse.success) {
        const exportId = exportResponse.data.exportId;
        
        // Poll for completion (simplified for demo)
        setTimeout(async () => {
          try {
            await downloadExport.mutateAsync(exportId);
            toast.success('Your data has been downloaded successfully');
          } catch (error) {
            toast.error('Failed to download data export');
          }
        }, 3000);
        
      } else {
        throw new Error(exportResponse.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  // Loading states
  const isDownloading = requestExport.isPending || downloadExport.isPending;
  const isDeletingProfile = deleteProfile.isPending;

  const handleDeleteProfile = async () => {
    if (!user) return;
    
    try {
      await deleteProfile.mutateAsync({
        confirmText: 'DELETE MY PROFILE'
      });
      
      toast.success('Your profile has been deleted successfully');
      
      // Log out and redirect
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Profile deletion failed:', error);
      toast.error('Failed to delete profile. Please contact support.');
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Privacy & Data</h2>
        <p className="mt-2 text-gray-600">
          Manage your data privacy, control what information is shared, and exercise your data rights.
        </p>
      </div>


      {/* Data Rights */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Data Rights</h3>
          <p className="text-sm text-gray-600 mt-1">
            Under privacy regulations, you have rights regarding your personal data.
          </p>
        </div>
        
        <PrivacySetting
          icon={<Download className="h-5 w-5" />}
          title="Download Your Data"
          description="Get a copy of all your data including profile information, journal entries, achievements, and more"
          action={
            <Button
              onClick={handleDownloadData}
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Data
                </>
              )}
            </Button>
          }
        />
      </div>

      {/* Data Export Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">What's included in your data export?</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>Profile information and settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>All journal entries and comments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>Achievement history and progress</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>Skills and endorsements</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>Network connections and workspace memberships</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-3 w-3" />
                <span>Notification history and preferences</span>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-3">
              Data will be provided in JSON format for easy portability. Large exports may be sent via email.
            </p>
          </div>
        </div>
      </div>

      {/* Dangerous Actions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 text-red-700">Danger Zone</h3>
          <p className="text-sm text-gray-600 mt-1">
            These actions cannot be undone. Please proceed with caution.
          </p>
        </div>
        
        <PrivacySetting
          icon={<Trash2 className="h-5 w-5" />}
          title="Delete Your Profile"
          description="Permanently delete your account and all associated data. This action cannot be undone."
          action={
            <Button
              onClick={() => setShowDeleteConfirmation(true)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Profile
            </Button>
          }
          dangerous={true}
        />
      </div>

      {/* Profile Deletion Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900 mb-2">Important: Profile Deletion</h4>
            <div className="text-sm text-red-800 space-y-2">
              <p>When you delete your profile, the following will happen:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your profile and all personal information will be permanently deleted</li>
                <li>All your journal entries, comments, and achievements will be removed</li>
                <li>Your network connections will be terminated</li>
                <li>You will be removed from all workspaces</li>
                <li>Your data cannot be recovered after deletion</li>
              </ul>
              <p className="font-medium mt-3">
                Consider downloading your data first if you want to keep a copy of your information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Privacy & Legal</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Your privacy is important to us. We comply with GDPR, CCPA, and other privacy regulations.
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0">
                  Privacy Policy
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0">
                  Terms of Service
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0">
                  Contact Support
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteProfile}
        title="Delete Your Profile"
        description="This will permanently delete your InChronicle account and all associated data. Your profile, journal entries, achievements, and connections will be completely removed and cannot be recovered."
        confirmText="Delete My Profile"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        requiresTyping={true}
        requiredText="DELETE MY PROFILE"
        isLoading={isDeletingProfile}
      />
    </div>
  );
}

export default PrivacySettings;