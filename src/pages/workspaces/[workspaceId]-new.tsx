import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Building2,
  Calendar,
  FileText,
  Plus,
  Users,
  FolderOpen,
  Settings,
  UserPlus,
  Eye,
  Heart,
  BarChart3,
  Palette,
  Shield,
  X,
  Search,
  Filter,
  Globe,
  Lock,
  Upload,
  Download,
  MoreVertical,
  Paperclip,
  Tag,
  Mail
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  useWorkspace, 
  useWorkspaceMembers, 
  useWorkspaceCategories, 
  useWorkspaceFiles,
  useWorkspaceJournalEntries,
  useInviteMember,
  useCreateCategory,
  useUploadFile 
} from '../../hooks/useWorkspace';
import { JournalCard } from '../../components/journal/journal-card';
import { useAuth } from '../../contexts/AuthContext';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

function InviteUserModal({ isOpen, onClose, workspaceId }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [message, setMessage] = useState('');
  
  const inviteMutation = useInviteMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMutation.mutateAsync({
        workspaceId,
        email,
        role,
        message: message || undefined
      });
      onClose();
      setEmail('');
      setRole('MEMBER');
      setMessage('');
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Invite Team Member
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="colleague@company.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="VIEWER">Viewer - Can view content</option>
                <option value="MEMBER">Member - Can create and edit</option>
                <option value="ADMIN">Admin - Full access</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder="Add a personal note..."
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={inviteMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

function CreateCategoryModal({ isOpen, onClose, workspaceId }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  
  const createCategoryMutation = useCreateCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategoryMutation.mutateAsync({
        workspaceId,
        name,
        description: description || undefined,
        color
      });
      onClose();
      setName('');
      setDescription('');
      setColor('#3B82F6');
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Create Category
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Engineering, Design, Product"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={2}
                placeholder="Brief description of this category..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex space-x-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2",
                      color === colorOption ? "border-gray-900" : "border-gray-300"
                    )}
                    style={{ backgroundColor: colorOption }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCategoryMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface AddFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

function AddFileModal({ isOpen, onClose, workspaceId }: AddFileModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  
  const uploadMutation = useUploadFile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadMutation.mutateAsync({
        workspaceId,
        file,
        description: description || undefined
      });
      onClose();
      setFile(null);
      setDescription('');
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Upload File
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder="What is this file for?"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={uploadMutation.isPending || !file}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  // API queries
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId!);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId!);
  const { data: categories, isLoading: categoriesLoading } = useWorkspaceCategories(workspaceId!);
  const { data: filesData, isLoading: filesLoading } = useWorkspaceFiles(workspaceId!, {
    search: searchQuery
  });
  const { data: journalData, isLoading: journalLoading } = useWorkspaceJournalEntries(workspaceId!, {
    category: selectedCategory,
    search: searchQuery,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const isLoading = workspaceLoading || membersLoading || categoriesLoading || filesLoading || journalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">Workspace not found</h2>
            <p className="text-gray-500 mt-2">The workspace you're looking for doesn't exist or you don't have access.</p>
          </div>
        </div>
      </div>
    );
  }

  const files = filesData?.files || [];
  const journalEntries = journalData?.entries || [];
  const userRole = workspace.userRole;
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Workspace Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
                <p className="text-gray-600 mt-1">{workspace.organization.name}</p>
                {workspace.description && (
                  <p className="text-gray-500 mt-2 max-w-2xl">{workspace.description}</p>
                )}
                
                <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {workspace.stats.totalMembers} members
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {workspace.stats.totalJournalEntries} entries
                  </div>
                  <div className="flex items-center">
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {workspace.stats.totalFiles} files
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    {workspace.stats.totalCategories} categories
                  </div>
                  <div className="flex items-center">
                    {workspace.visibility === 'PUBLIC' ? <Globe className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                    {workspace.visibility.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
            
            {canManage && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  onClick={() => setShowInviteModal(true)}
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowNewEntryModal(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
            {canManage && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowFileModal(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add File
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex space-x-8 border-b border-gray-200 mb-6">
            <Tabs.Trigger
              value="journal"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Journal Entries ({journalEntries.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="files"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Files ({files.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="members"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Members ({members?.length || 0})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="categories"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Categories ({categories?.length || 0})
            </Tabs.Trigger>
          </Tabs.List>

          {/* Journal Entries Tab */}
          <Tabs.Content value="journal">
            <div className="space-y-4">
              {/* Category Filter */}
              {categories && categories.length > 0 && (
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Filter by category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name} ({category._count.journalEntries})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Journal Entries */}
              <div className="space-y-6">
                {journalEntries.map((entry) => (
                  <JournalCard
                    key={entry.id}
                    journal={entry}
                    viewMode="workspace"
                    showMenuButton={true}
                    showAnalyticsButton={true}
                    showUserProfile={true}
                  />
                ))}
                {journalEntries.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No journal entries</h3>
                    <p className="text-gray-500">Start documenting your work by creating your first entry.</p>
                    <Button 
                      onClick={() => setShowNewEntryModal(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first entry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>

          {/* Files Tab */}
          <Tabs.Content value="files">
            <div className="space-y-4">
              {files.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <div key={file.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Paperclip className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                            <p className="text-sm text-gray-500">{file.size}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Uploaded by {file.uploadedBy.name} • {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No files uploaded</h3>
                  <p className="text-gray-500">Share files and documents with your team.</p>
                  {canManage && (
                    <Button 
                      onClick={() => setShowFileModal(true)}
                      className="mt-4"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload your first file
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Members Tab */}
          <Tabs.Content value="members">
            <div className="space-y-4">
              {members && members.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.user.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'}
                          alt={member.user.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                          <p className="text-sm text-gray-600">{member.user.title || member.user.email}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                        {canManage && member.role !== 'OWNER' && (
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No team members</h3>
                  <p className="text-gray-500">Invite colleagues to collaborate on this workspace.</p>
                  {canManage && (
                    <Button 
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite team members
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Categories Tab */}
          <Tabs.Content value="categories">
            <div className="space-y-4">
              {categories && categories.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {category._count.journalEntries} entries
                          </p>
                        </div>
                        {canManage && (
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No categories</h3>
                  <p className="text-gray-500">Organize your content with categories.</p>
                  {canManage && (
                    <Button 
                      onClick={() => setShowCategoryModal(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first category
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Modals */}
        <InviteUserModal 
          isOpen={showInviteModal} 
          onClose={() => setShowInviteModal(false)}
          workspaceId={workspaceId!}
        />
        <CreateCategoryModal 
          isOpen={showCategoryModal} 
          onClose={() => setShowCategoryModal(false)}
          workspaceId={workspaceId!}
        />
        <AddFileModal 
          isOpen={showFileModal} 
          onClose={() => setShowFileModal(false)}
          workspaceId={workspaceId!}
        />
        
        {/* New Entry Modal - This would use the existing NewEntryModal component */}
        {showNewEntryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Create New Entry
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        New entry creation will be implemented soon.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setShowNewEntryModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}