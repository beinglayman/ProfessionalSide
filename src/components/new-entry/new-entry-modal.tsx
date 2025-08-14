import React, { useState, useRef, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { X, ChevronRight, ChevronLeft, Save, Plus, Minus, Check, Eye, FileText, Globe, Lock, Settings, Trophy, Award, Badge, Star, Users, UserCheck, Briefcase, Shield, Upload, Link, Trash2, Github, Figma, File, Cloud, ExternalLink, Smartphone, MonitorSpeaker, Database, BarChart3, Palette, Zap, Layers, BookOpen, Calendar, Search, TestTube, Wrench, Building2, UserCog, Target, TrendingUp, MessageSquare, GitBranch, Confluence} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Editor } from '../journal/editor';
import { useCreateJournalEntry } from '../../hooks/useJournal';
import { CreateJournalEntryRequest } from '../../services/journal.service';
import { useFocusAreas, useWorkCategories, useWorkTypes, useSkillsForWorkTypes } from '../../hooks/useReference';
import { useWorkspaces, useWorkspaceMembers } from '../../hooks/useWorkspace';
import { useAuth } from '../../contexts/AuthContext';
import { TagInput } from '../ui/tag-input';
import { useGenerateAIEntries } from '../../hooks/useAIGeneration';

interface NewEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Reference data is now fetched from the API


export const NewEntryModal: React.FC<NewEntryModalProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [generatedEntries, setGeneratedEntries] = useState<{
    workspaceEntry: string;
    networkEntry: string;
  } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const createJournalMutation = useCreateJournalEntry();
  const generateAIMutation = useGenerateAIEntries();
  const { user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    // Step 1: Primary Focus Area (Persona)
    primaryFocusArea: '',
    primaryFocusAreaOthers: '',
    
    // Step 2: Work Category
    workCategory: '',
    workCategoryOthers: '',
    
    // Step 3: Work Type
    workTypes: [] as string[],
    workTypeOthers: '',
    
    // Step 4: Work Details (Title & Description matching screenshot format)
    title: '', // "E-commerce Platform Performance Optimization"
    description: '', // "Led performance optimization efforts for a high-traffic web application..."
    result: '',
    
    // Step 5: Skills (matching screenshot)
    skillsApplied: [] as string[], // React.js, TypeScript, Performance Optimization
    
    // Step 6: Project & Workspace (matching screenshot)
    workspaceId: '', // "Q1 Product Updates"
    projects: [] as string[],
    departments: [] as string[],
    
    // Step 7: Publishing (matching screenshot)
    isPublished: true, // Published vs Workspace Only (default selected)
    
    // Other fields
    collaborators: [] as string[],
    reviewers: [] as string[],
    fullContent: '',
    category: 'General',
    tags: [] as string[],
    
    // Artifacts
    artifacts: [] as Array<{
      id: string;
      name: string;
      type: 'document' | 'code' | 'design' | 'data' | 'presentation' | 'link';
      url: string;
      size?: string;
      metadata?: string;
    }>,
  });

  // Fetch reference data from API
  const { data: focusAreas = [], isLoading: loadingFocusAreas, error: focusAreasError } = useFocusAreas();
  const { data: workCategories = [], isLoading: loadingWorkCategories, error: workCategoriesError } = useWorkCategories(formData.primaryFocusArea || null);
  const { data: workTypes = [], isLoading: loadingWorkTypes, error: workTypesError } = useWorkTypes(formData.workCategory || null);
  const { data: availableSkills = [], isLoading: loadingSkills, error: skillsError } = useSkillsForWorkTypes(formData.workTypes || []);

  // Use only API data from database - no fallback data
  const finalFocusAreas = focusAreas;
  const finalWorkCategories = workCategories;
  const finalWorkTypes = workTypes;
  const finalAvailableSkills = availableSkills;
  
  // Fetch workspace data from API
  const { data: workspaces = [], isLoading: loadingWorkspaces, error: workspacesError } = useWorkspaces();
  const { data: workspaceMembers = [], isLoading: loadingWorkspaceMembers, error: workspaceMembersError } = useWorkspaceMembers(formData.workspaceId || '');
  
  // Filter out current user from workspace members for collaborators/reviewers
  // Ensure workspaceMembers is always an array before calling filter
  const safeWorkspaceMembers = Array.isArray(workspaceMembers) ? workspaceMembers : [];
  const availableMembers = safeWorkspaceMembers.filter(member => member.userId !== currentUser?.id);
  
  // Safe computed values for artifact filtering
  const safeArtifacts = Array.isArray(formData.artifacts) ? formData.artifacts : [];
  const fileArtifactsCount = safeArtifacts.filter(a => a.type !== 'link').length;
  const customLinksCount = safeArtifacts.filter(a => a.metadata === 'custom').length;


  // Reset dependent fields when focus area changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      workCategory: '',
      workTypes: [],
      workCategoryOthers: '',
      workTypeOthers: ''
    }));
  }, [formData.primaryFocusArea]);

  // Reset work types when work category changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      workTypes: [],
      workTypeOthers: ''
    }));
  }, [formData.workCategory]);

  // Reset skills when work types change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      skillsApplied: []
    }));
  }, [formData.workTypes]);

  const getTotalSteps = () => 7;

  const validateCurrentStep = () => {
    switch (step) {
      case 1:
        if (!formData.primaryFocusArea) 
          return { valid: false, message: 'Please select a focus area.' };
        if (formData.primaryFocusArea === '99-others' && !formData.primaryFocusAreaOthers.trim())
          return { valid: false, message: 'Please describe your focus area.' };
        return { valid: true, message: '' };
      
      case 2:
        if (!formData.workCategory) 
          return { valid: false, message: 'Please select a work category.' };
        if (formData.workCategory?.endsWith('-others') && !formData.workCategoryOthers.trim())
          return { valid: false, message: 'Please describe your work category.' };
        return { valid: true, message: '' };
      
      case 3:
        if (!formData.workTypes || formData.workTypes.length === 0) 
          return { valid: false, message: 'Please select at least one work type.' };
        if (formData.workTypes.includes('others') && !formData.workTypeOthers.trim())
          return { valid: false, message: 'Please describe your work type.' };
        return { valid: true, message: '' };
      
      case 4:
        if (!formData.workspaceId) 
          return { valid: false, message: 'Please select a workspace.' };
        if (!formData.title?.trim()) 
          return { valid: false, message: 'Please provide a title for your work.' };
        if (!formData.description?.trim()) 
          return { valid: false, message: 'Please provide a description of your work.' };
        return { valid: true, message: '' };
      
      case 5:
        if (!formData.skillsApplied || formData.skillsApplied.length === 0) 
          return { valid: false, message: 'Please select at least one skill.' };
        return { valid: true, message: '' };
      
      case 6:
        // Collaborators and Reviewers step - optional
        return { valid: true, message: '' };
      
      case 7:
        // AI Preview step
        return { valid: true, message: '' };
      
      default:
        return { valid: true, message: '' };
    }
  };

  const handleNext = () => {
    const validationResult = validateCurrentStep();
    
    if (validationResult.valid) {
      setValidationError('');
      if (step < getTotalSteps()) {
        setStep(step + 1);
      }
    } else {
      setValidationError(validationResult.message);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!generatedEntries) {
      setValidationError('Please generate AI content first');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get skill names from IDs
      const skillNames = formData.skillsApplied.map(skillId => {
        const skill = finalAvailableSkills.find(s => s.id === skillId);
        return skill ? skill.name : skillId;
      });
      
      // Get work type names from IDs  
      const workTypeNames = formData.workTypes.map((workTypeId: string) => {
        const workType = finalWorkTypes.find(wt => wt.id === workTypeId);
        return workType ? workType.label : workTypeId;
      });

      // Create workspace entry (always created)
      const workspaceJournalData: CreateJournalEntryRequest = {
        title: formData.title.trim(),
        description: formData.description.trim().substring(0, 490) + (formData.description.length > 490 ? '...' : ''), // Use original description (truncated if needed)
        fullContent: generatedEntries.workspaceEntry,
        workspaceId: formData.workspaceId,
        visibility: 'workspace',
        category: formData.workCategory || 'General',
        tags: [...new Set([...workTypeNames, ...formData.tags])],
        skills: skillNames,
        collaborators: formData.collaborators.map((userId: string) => ({
          userId: userId,
          role: 'collaborator'
        })),
        reviewers: formData.reviewers.map((userId: string) => ({
          userId: userId
          // Remove department field if undefined to avoid validation issues
        })),
        artifacts: formData.artifacts,
        outcomes: formData.result ? [{
          category: 'performance' as const,
          title: 'Results & Outcomes',
          description: formData.result.trim()
          // Remove highlight and metrics if undefined to avoid validation issues
        }] : []
      };

      console.log('📝 Creating workspace entry:', workspaceJournalData);
      const workspaceResponse = await createJournalMutation.mutateAsync(workspaceJournalData);

      // Create network entry if publishing is enabled
      if (formData.isPublished) {
        const networkJournalData: CreateJournalEntryRequest = {
          ...workspaceJournalData,
          description: formData.description.trim().substring(0, 490) + (formData.description.length > 490 ? '...' : ''), // Use original description (truncated if needed)
          fullContent: generatedEntries.networkEntry,
          visibility: 'network'
        };

        console.log('🌐 Creating network entry:', networkJournalData);
        await createJournalMutation.mutateAsync(networkJournalData);
      }
      
      if (workspaceResponse.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          onOpenChange(false);
          // Reset form
          setFormData({
            primaryFocusArea: '',
            primaryFocusAreaOthers: '',
            workCategory: '',
            workCategoryOthers: '',
            workTypes: [],
            workTypeOthers: '',
            title: '',
            description: '',
            result: '',
            skillsApplied: [],
            workspaceId: '',
            projects: [],
            departments: [],
            isPublished: true,
            collaborators: [],
            reviewers: [],
            fullContent: '',
            category: 'General',
            tags: [],
            artifacts: [],
          });
          setGeneratedEntries(null);
          setStep(1);
        }, 1500);
      } else {
        throw new Error(workspaceResponse.error || 'Failed to create entry');
      }
    } catch (error: any) {
      console.error('❌ Failed to create AI-generated journal entry:', error);
      setIsGeneratingAI(false);
      
      let errorMessage = 'Unknown error';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.error || 'Unknown error';
        
        // Handle AI service specific errors
        if (errorMessage.includes('AI service is not properly configured')) {
          errorMessage = 'AI service is not configured. Please check with your administrator.';
        } else if (errorMessage.includes('Failed to generate entries')) {
          errorMessage = 'AI generation failed. Please try again or check your input.';
        }
        
        // If it's a validation error with details, show the specific validation issues
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationMessages = errorData.details.map((detail: any) => 
            `${detail.path?.join('.')}: ${detail.message}`
          ).join(', ');
          errorMessage = `Validation failed: ${validationMessages}`;
        } else if (errorData.details) {
          errorMessage = `${errorMessage}: ${JSON.stringify(errorData.details)}`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setValidationError(`Failed to create AI-generated journal entry: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setFormData(prev => {
      const safeSkillsApplied = Array.isArray(prev.skillsApplied) ? prev.skillsApplied : [];
      return {
        ...prev,
        skillsApplied: safeSkillsApplied.includes(skillId)
          ? safeSkillsApplied.filter(id => id !== skillId)
          : [...safeSkillsApplied, skillId]
      };
    });
  };

  const toggleWorkType = (workTypeId: string) => {
    setFormData(prev => {
      const safeWorkTypes = Array.isArray(prev.workTypes) ? prev.workTypes : [];
      return {
        ...prev,
        workTypes: safeWorkTypes.includes(workTypeId)
          ? safeWorkTypes.filter(id => id !== workTypeId)
          : [...safeWorkTypes, workTypeId]
      };
    });
  };

  const toggleCollaborator = (userId: string) => {
    setFormData(prev => {
      const safeCollaborators = Array.isArray(prev.collaborators) ? prev.collaborators : [];
      return {
        ...prev,
        collaborators: safeCollaborators.includes(userId)
          ? safeCollaborators.filter(id => id !== userId)
          : [...safeCollaborators, userId]
      };
    });
  };

  const toggleReviewer = (userId: string) => {
    setFormData(prev => {
      const safeReviewers = Array.isArray(prev.reviewers) ? prev.reviewers : [];
      return {
        ...prev,
        reviewers: safeReviewers.includes(userId)
          ? safeReviewers.filter(id => id !== userId)
          : [...safeReviewers, userId]
      };
    });
  };

  const addArtifact = (artifact: { name: string; type: 'document' | 'code' | 'design' | 'data' | 'presentation' | 'link'; url: string; size?: string; metadata?: string; }) => {
    const newArtifact = {
      id: `temp-${Date.now()}`,
      ...artifact
    };
    setFormData(prev => {
      const safeArtifacts = Array.isArray(prev.artifacts) ? prev.artifacts : [];
      return {
        ...prev,
        artifacts: [...safeArtifacts, newArtifact]
      };
    });
  };

  const removeArtifact = (id: string) => {
    setFormData(prev => {
      const safeArtifacts = Array.isArray(prev.artifacts) ? prev.artifacts : [];
      return {
        ...prev,
        artifacts: safeArtifacts.filter(artifact => artifact.id !== id)
      };
    });
  };

  const getArtifactIcon = (type: string, metadata?: string) => {
    // Check metadata for specific platform types first
    if (metadata) {
      switch (metadata) {
        case 'github': return <Github className="h-4 w-4 text-gray-900" />;
        case 'figma': return <Figma className="h-4 w-4 text-purple-600" />;
        case 'sharepoint': return <Building2 className="h-4 w-4 text-blue-600" />;
        case 'onedrive': return <Cloud className="h-4 w-4 text-blue-500" />;
        case 'confluence': return <BookOpen className="h-4 w-4 text-blue-700" />;
        case 'notion': return <FileText className="h-4 w-4 text-gray-800" />;
        case 'drive': return <Database className="h-4 w-4 text-green-600" />;
        case 'jira': return <Layers className="h-4 w-4 text-blue-600" />;
        case 'custom': return <Link className="h-4 w-4 text-gray-600" />;
      }
    }
    
    // Fall back to type-based icons
    switch (type) {
      case 'code': return <Github className="h-4 w-4 text-gray-900" />;
      case 'design': return <Palette className="h-4 w-4 text-purple-600" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'data': return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'presentation': return <MonitorSpeaker className="h-4 w-4 text-orange-600" />;
      case 'link': return <ExternalLink className="h-4 w-4 text-gray-600" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleFileUpload = async (file: File) => {
    // For now, we'll create a local URL for the file
    // In a real implementation, this would upload to a file storage service
    const fileUrl = URL.createObjectURL(file);
    const fileSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    let fileType: 'document' | 'code' | 'design' | 'data' | 'presentation' = 'document';
    
    // Determine file type based on extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'figma'].includes(extension || '')) {
      fileType = 'design';
    } else if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(extension || '')) {
      fileType = 'code';
    } else if (['csv', 'xlsx', 'sql', 'db'].includes(extension || '')) {
      fileType = 'data';
    } else if (['ppt', 'pptx', 'key'].includes(extension || '')) {
      fileType = 'presentation';
    }
    
    addArtifact({
      name: file.name,
      type: fileType,
      url: fileUrl,
      size: fileSize,
      metadata: `File upload • ${file.type}`
    });
    
    // Show immediate success feedback for file upload
    const uploadArea = document.querySelector('[data-upload-area]') as HTMLElement;
    if (uploadArea) {
      const feedback = document.createElement('div');
      feedback.className = 'absolute inset-0 bg-green-100 border-2 border-green-400 rounded-lg flex items-center justify-center transition-all duration-300 z-10';
      feedback.innerHTML = '<div class="flex items-center text-green-700 font-medium"><svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>File uploaded!</div>';
      uploadArea.style.position = 'relative';
      uploadArea.appendChild(feedback);
      setTimeout(() => feedback.remove(), 2000);
    }
  };

  const renderIcon = (iconName: string) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (iconName) {
      case 'layers': return <Layers {...iconProps} className="h-4 w-4 text-blue-600" />;
      case 'github': return <Github {...iconProps} className="h-4 w-4 text-gray-900" />;
      case 'book-open': return <BookOpen {...iconProps} className="h-4 w-4 text-blue-700" />;
      case 'globe': return <Globe {...iconProps} className="h-4 w-4 text-green-600" />;
      case 'cloud': return <Cloud {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'smartphone': return <Smartphone {...iconProps} className="h-4 w-4 text-gray-700" />;
      case 'bar-chart-3': return <BarChart3 {...iconProps} className="h-4 w-4 text-green-600" />;
      case 'shield': return <Shield {...iconProps} className="h-4 w-4 text-red-600" />;
      case 'figma': return <Figma {...iconProps} className="h-4 w-4 text-purple-600" />;
      case 'palette': return <Palette {...iconProps} className="h-4 w-4 text-purple-500" />;
      case 'search': return <Search {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'target': return <Target {...iconProps} className="h-4 w-4 text-red-500" />;
      case 'calendar': return <Calendar {...iconProps} className="h-4 w-4 text-orange-500" />;
      case 'trending-up': return <TrendingUp {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'message-square': return <MessageSquare {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'database': return <Database {...iconProps} className="h-4 w-4 text-green-600" />;
      case 'test-tube': return <TestTube {...iconProps} className="h-4 w-4 text-orange-500" />;
      case 'wrench': return <Wrench {...iconProps} className="h-4 w-4 text-gray-600" />;
      case 'building-2': return <Building2 {...iconProps} className="h-4 w-4 text-blue-600" />;
      case 'zap': return <Zap {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'monitor-speaker': return <MonitorSpeaker {...iconProps} className="h-4 w-4 text-purple-500" />;
      case 'git-branch': return <GitBranch {...iconProps} className="h-4 w-4 text-orange-500" />;
      case 'user-cog': return <UserCog {...iconProps} className="h-4 w-4 text-blue-500" />;
      default: return <ExternalLink {...iconProps} className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContextualSuggestions = () => {
    const focusArea = finalFocusAreas.find(area => area.id === formData.primaryFocusArea);
    const workCategory = finalWorkCategories.find(cat => cat.id === formData.workCategory);
    
    if (!focusArea || !workCategory) return [];

    // Comprehensive suggestions based on focus area + work category combinations
    const suggestions: Record<string, Record<string, Array<{
      name: string;
      type: 'github' | 'figma' | 'sharepoint' | 'onedrive' | 'confluence' | 'notion' | 'drive' | 'jira' | 'link';
      placeholder: string;
      icon: string;
      description: string;
    }>>> = {
      '01-development': {
        'dev-frontend': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Feature tickets and bugs' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/repo', icon: 'github', description: 'Source code repository' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Component documentation' },
          { name: 'Live Demo', type: 'link', placeholder: 'https://your-app.vercel.app', icon: 'globe', description: 'Live application demo' }
        ],
        'dev-backend': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'API development tasks' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/api', icon: 'github', description: 'Backend code repository' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'API documentation' },
          { name: 'Deployment Dashboard', type: 'link', placeholder: 'https://aws.amazon.com/...', icon: 'cloud', description: 'Cloud deployment' }
        ],
        'dev-fullstack': [
          { name: 'Jira Epic', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'End-to-end feature epic' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/fullstack-app', icon: 'github', description: 'Full stack code repository' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'System documentation' },
          { name: 'Live Application', type: 'link', placeholder: 'https://your-app.com', icon: 'globe', description: 'Production application' }
        ],
        'dev-mobile': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Mobile feature tickets' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/mobile-app', icon: 'github', description: 'Mobile app source code' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'App architecture docs' },
          { name: 'App Store Link', type: 'link', placeholder: 'https://apps.apple.com/...', icon: 'smartphone', description: 'iOS/Android app store' }
        ],
        'dev-devops': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Infrastructure tasks' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/infrastructure', icon: 'github', description: 'Infrastructure as code' },
          { name: 'Confluence Runbooks', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Infrastructure documentation' },
          { name: 'Monitoring Dashboard', type: 'link', placeholder: 'https://grafana.company.com/...', icon: 'bar-chart-3', description: 'System monitoring' }
        ],
        'dev-data': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Data pipeline tasks' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/data-pipeline', icon: 'github', description: 'Data engineering code' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Pipeline documentation' },
          { name: 'Data Dashboard', type: 'link', placeholder: 'https://tableau.company.com/...', icon: 'bar-chart-3', description: 'Data visualization' }
        ],
        'dev-security': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Security implementations' },
          { name: 'GitHub Repository', type: 'github', placeholder: 'https://github.com/username/security-tools', icon: 'github', description: 'Security code repository' },
          { name: 'Confluence Docs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Security procedures' },
          { name: 'Security Report', type: 'link', placeholder: 'https://security-tools.company.com/...', icon: 'shield', description: 'Security assessment' }
        ]
      },
      '02-design': {
        'design-ux': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'UX improvement tasks' },
          { name: 'Figma Prototype', type: 'figma', placeholder: 'https://figma.com/proto/...', icon: 'figma', description: 'Interactive prototype' },
          { name: 'Confluence Research', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'User research findings' },
          { name: 'User Testing', type: 'link', placeholder: 'https://loom.com/...', icon: 'search', description: 'Testing session recordings' }
        ],
        'design-ui': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'UI component tasks' },
          { name: 'Figma Design File', type: 'figma', placeholder: 'https://figma.com/file/...', icon: 'figma', description: 'UI design mockups' },
          { name: 'Confluence Specs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Design specifications' },
          { name: 'Style Guide', type: 'link', placeholder: 'https://styleguide.company.com/...', icon: 'palette', description: 'Brand guidelines' }
        ],
        'design-visual': [
          { name: 'Figma Design File', type: 'figma', placeholder: 'https://figma.com/file/...', icon: 'figma', description: 'Visual design assets' },
          { name: 'Confluence Guidelines', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Brand guidelines' },
          { name: 'Asset Library', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Design assets' },
          { name: 'Brand Portal', type: 'link', placeholder: 'https://brand.company.com/...', icon: 'palette', description: 'Brand resources' }
        ],
        'design-product': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Product design tasks' },
          { name: 'Figma Design System', type: 'figma', placeholder: 'https://figma.com/file/...', icon: 'figma', description: 'Product design files' },
          { name: 'Confluence Process', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Design process docs' },
          { name: 'Product Requirements', type: 'link', placeholder: 'https://productboard.com/...', icon: 'target', description: 'Product requirements' }
        ],
        'design-interaction': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Interaction improvements' },
          { name: 'Figma Prototype', type: 'figma', placeholder: 'https://figma.com/proto/...', icon: 'figma', description: 'Interaction prototypes' },
          { name: 'Confluence Specs', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Interaction specifications' },
          { name: 'Motion Demo', type: 'link', placeholder: 'https://lottiefiles.com/...', icon: 'zap', description: 'Animation examples' }
        ],
        'design-research': [
          { name: 'Confluence Research', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Research methodology' },
          { name: 'Research Data', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Research findings' },
          { name: 'Survey Results', type: 'link', placeholder: 'https://typeform.com/...', icon: 'bar-chart-3', description: 'User survey data' },
          { name: 'Interview Notes', type: 'notion', placeholder: 'https://notion.so/...', icon: 'message-square', description: 'User interview insights' }
        ],
        'design-systems': [
          { name: 'Jira Tickets', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Component development' },
          { name: 'Figma Design System', type: 'figma', placeholder: 'https://figma.com/file/...', icon: 'figma', description: 'Design system library' },
          { name: 'Confluence Guidelines', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Usage guidelines' },
          { name: 'Storybook', type: 'link', placeholder: 'https://storybook.company.com/...', icon: 'git-branch', description: 'Component library' }
        ]
      },
      '03-product-management': {
        'pm-strategy': [
          { name: 'Confluence Strategy', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Product strategy docs' },
          { name: 'Market Research', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Market analysis data' },
          { name: 'Strategy Presentation', type: 'link', placeholder: 'https://slides.google.com/...', icon: 'monitor-speaker', description: 'Strategy presentation' },
          { name: 'Roadmap Tool', type: 'link', placeholder: 'https://productplan.com/...', icon: 'calendar', description: 'Strategic roadmap' }
        ],
        'pm-roadmap': [
          { name: 'Jira Epics', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Roadmap epics' },
          { name: 'Confluence Roadmap', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Roadmap documentation' },
          { name: 'Roadmap Tool', type: 'link', placeholder: 'https://productplan.com/...', icon: 'calendar', description: 'Planning tool' },
          { name: 'Strategy Slides', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'monitor-speaker', description: 'Planning presentations' }
        ],
        'pm-requirements': [
          { name: 'Jira User Stories', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Feature requirements' },
          { name: 'Confluence PRD', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Product requirements' },
          { name: 'Wireframes', type: 'figma', placeholder: 'https://figma.com/file/...', icon: 'figma', description: 'Feature wireframes' },
          { name: 'Requirements Tool', type: 'link', placeholder: 'https://productboard.com/...', icon: 'target', description: 'Requirements management' }
        ],
        'pm-research': [
          { name: 'Confluence Research', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Market research findings' },
          { name: 'Research Data', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Market analysis data' },
          { name: 'Survey Platform', type: 'link', placeholder: 'https://typeform.com/...', icon: 'bar-chart-3', description: 'Customer surveys' },
          { name: 'Analytics Dashboard', type: 'link', placeholder: 'https://analytics.google.com/...', icon: 'trending-up', description: 'User behavior data' }
        ],
        'pm-launch': [
          { name: 'Jira Launch Tasks', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Launch checklist items' },
          { name: 'Confluence GTM', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Go-to-market strategy' },
          { name: 'Launch Materials', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Marketing materials' },
          { name: 'Launch Metrics', type: 'link', placeholder: 'https://mixpanel.com/...', icon: 'bar-chart-3', description: 'Success tracking' }
        ],
        'pm-analytics': [
          { name: 'Confluence Methodology', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Analytics methodology' },
          { name: 'Analytics Dashboard', type: 'link', placeholder: 'https://mixpanel.com/...', icon: 'bar-chart-3', description: 'Product analytics' },
          { name: 'A/B Test Results', type: 'link', placeholder: 'https://optimizely.com/...', icon: 'test-tube', description: 'Experiment results' },
          { name: 'Data Reports', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Analytics reports' }
        ],
        'pm-growth': [
          { name: 'Jira Growth Tasks', type: 'jira', placeholder: 'https://company.atlassian.net/browse/...', icon: 'layers', description: 'Growth experiments' },
          { name: 'Confluence Strategy', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Growth strategy docs' },
          { name: 'Experiment Platform', type: 'link', placeholder: 'https://optimizely.com/...', icon: 'test-tube', description: 'A/B testing platform' },
          { name: 'Growth Metrics', type: 'link', placeholder: 'https://amplitude.com/...', icon: 'trending-up', description: 'Growth analytics' }
        ],
        'pm-stakeholder': [
          { name: 'Confluence Communications', type: 'confluence', placeholder: 'https://company.atlassian.net/wiki/...', icon: 'book-open', description: 'Stakeholder plans' },
          { name: 'Status Updates', type: 'drive', placeholder: 'https://drive.google.com/...', icon: 'database', description: 'Status presentations' },
          { name: 'Meeting Notes', type: 'notion', placeholder: 'https://notion.so/...', icon: 'message-square', description: 'Stakeholder meetings' },
          { name: 'Feedback Portal', type: 'link', placeholder: 'https://productboard.com/...', icon: 'user-cog', description: 'Stakeholder feedback' }
        ]
      }
      // Continue with other focus areas...
    };

    return suggestions[focusArea.id]?.[workCategory.id] || [];
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 1 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Select Your Primary Focus Area</p>
            </div>
            
            {loadingFocusAreas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading focus areas...</span>
              </div>
            ) : focusAreasError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-800">
                    <h3 className="text-sm font-medium">Error loading focus areas</h3>
                    <p className="text-sm mt-1">{focusAreasError.message}</p>
                  </div>
                </div>
              </div>
            ) : finalFocusAreas.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-800">
                  <h3 className="text-sm font-medium">No focus areas available</h3>
                  <p className="text-sm mt-1">Reference data needs to be seeded in the database. Please ensure the reference tables (focus_areas, work_categories, work_types, skills) are populated with data.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {finalFocusAreas.map(area => (
                <label
                  key={area.id}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    formData.primaryFocusArea === area.id
                      ? "bg-primary-50 border-primary-300"
                      : "border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="primaryFocusArea"
                    value={area.id}
                    checked={formData.primaryFocusArea === area.id}
                    onChange={(e) => {
                      setFormData({...formData, primaryFocusArea: e.target.value});
                      // Auto-advance to next step (except for "Others" which needs additional input)
                      if (e.target.value !== '99-others') {
                        setIsAutoAdvancing(true);
                        setTimeout(() => {
                          if (step === 1) {
                            setStep(2);
                            setIsAutoAdvancing(false);
                          }
                        }, 600);
                      }
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{area.label}</div>
                    <div className="text-sm text-gray-600">{area.description}</div>
                  </div>
                </label>
              ))}
              
                {formData.primaryFocusArea === '99-others' && (
                  <textarea
                    value={formData.primaryFocusAreaOthers}
                    onChange={(e) => setFormData({...formData, primaryFocusAreaOthers: e.target.value})}
                    placeholder="Please describe your focus area..."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                  />
                )}
              </div>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 2 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Select Work Category</p>
            </div>
            
            {!formData.primaryFocusArea ? (
              <div className="text-center py-8 text-gray-500">
                Please select a focus area in step 1 first.
              </div>
            ) : workCategoriesError ? (
              <div className="text-center py-8 text-red-500">
                Error loading work categories: {workCategoriesError.message}
              </div>
            ) : loadingWorkCategories ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading work categories...</span>
              </div>
            ) : finalWorkCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No work categories found for the selected focus area.
              </div>
            ) : (
              <div className="space-y-3">
                {finalWorkCategories.map(category => (
                <label
                  key={category.id}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    formData.workCategory === category.id
                      ? "bg-primary-50 border-primary-300"
                      : "border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="workCategory"
                    value={category.id}
                    checked={formData.workCategory === category.id}
                    onChange={(e) => {
                      setFormData({...formData, workCategory: e.target.value});
                      // Auto-advance to next step (except for "Others" which needs additional input)
                      if (!e.target.value.endsWith('-others')) {
                        setIsAutoAdvancing(true);
                        setTimeout(() => {
                          if (step === 2) {
                            setStep(3);
                            setIsAutoAdvancing(false);
                          }
                        }, 600);
                      }
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{category.label}</div>
                  </div>
                </label>
              ))}
              
                {formData.workCategory?.endsWith('-others') && (
                  <textarea
                    value={formData.workCategoryOthers}
                    onChange={(e) => setFormData({...formData, workCategoryOthers: e.target.value})}
                    placeholder="Please describe your work category..."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                  />
                )}
              </div>
            )}
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 3 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Select Work Types</p>
            </div>
            
            {!formData.workCategory ? (
              <div className="text-center py-8 text-gray-500">
                Please select a work category in step 2 first.
              </div>
            ) : loadingWorkTypes ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading work types...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {finalWorkTypes.map(workType => (
                  <label
                    key={workType.id}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      formData.workTypes.includes(workType.id)
                        ? "bg-primary-50 border-primary-300"
                        : "border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.workTypes.includes(workType.id)}
                      onChange={() => toggleWorkType(workType.id)}
                    />
                    <div className="font-medium text-gray-900">{workType.label}</div>
                  </label>
                ))}
                
                {formData.workTypes.includes('others') && (
                  <textarea
                    value={formData.workTypeOthers}
                    onChange={(e) => setFormData({...formData, workTypeOthers: e.target.value})}
                    placeholder="Please describe your work type..."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                  />
                )}
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 4 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Workspace & Work Details</p>
            </div>
            
            {/* Workspace Selection Section */}
            <div className="space-y-6">
              <div>
                <Label.Root className="text-sm font-medium text-gray-700">
                  Workspace *
                </Label.Root>
                {loadingWorkspaces ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading workspaces...</span>
                  </div>
                ) : workspacesError ? (
                  <div className="text-center py-8 text-red-500">
                    Error loading workspaces: {workspacesError.message}
                  </div>
                ) : (
                  <select
                    value={formData.workspaceId}
                    onChange={(e) => setFormData({...formData, workspaceId: e.target.value, collaborators: [], reviewers: []})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  >
                    <option value="">Select a workspace...</option>
                    {workspaces.map(workspace => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} {workspace.organization ? `(${workspace.organization.name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <Label.Root className="text-sm font-medium text-gray-700">
                  Title *
                </Label.Root>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., E-commerce Platform Performance Optimization"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>
              
              <div>
                <Label.Root className="text-sm font-medium text-gray-700">
                  Description *
                </Label.Root>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g., Led performance optimization efforts for a high-traffic web application, focusing on Core Web Vitals and user experience enhancement."
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>
              
              <div>
                <Label.Root className="text-sm font-medium text-gray-700">
                  Results/Outcomes
                </Label.Root>
                <textarea
                  value={formData.result}
                  onChange={(e) => setFormData({...formData, result: e.target.value})}
                  placeholder="Describe the results and impact of your work..."
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>
              
            </div>
            
            {/* Artifacts & Resources Section */}
            <div className="border-t border-gray-200 pt-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    Supporting Materials
                  </h3>
                  {formData.artifacts.length > 0 && (
                    <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                      {formData.artifacts.length} item{formData.artifacts.length !== 1 ? 's' : ''} added
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Add links, files, and resources that support your work entry
                </p>
              </div>
                
              {/* Context-Aware Suggestions */}
              {formData.primaryFocusArea && formData.workCategory && (
                <div className="bg-blue-50 rounded-lg p-6 mb-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        💡 Suggested for your work
                      </h4>
                      <p className="text-xs text-blue-700">
                        {finalFocusAreas.find(a => a.id === formData.primaryFocusArea)?.label} - {finalWorkCategories.find(c => c.id === formData.workCategory)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getContextualSuggestions().map((suggestion, index) => (
                        <div key={index} className="group bg-white rounded-lg border border-blue-200 p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-center space-x-2 mb-3">
                            {renderIcon(suggestion.icon)}
                            <span className="text-sm font-medium text-gray-900">{suggestion.name}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
                          <div className="flex space-x-2">
                            <input
                              type="url"
                              placeholder={suggestion.placeholder}
                              className="flex-1 text-sm rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  if (input.value.trim()) {
                                    const typeMapping: Record<string, 'document' | 'code' | 'design' | 'data' | 'presentation' | 'link'> = {
                                      'github': 'code',
                                      'figma': 'design',
                                      'sharepoint': 'document',
                                      'onedrive': 'document',
                                      'confluence': 'document',
                                      'notion': 'document',
                                      'drive': 'data',
                                      'jira': 'link',
                                      'link': 'link'
                                    };
                                    
                                    addArtifact({
                                      name: suggestion.name,
                                      type: typeMapping[suggestion.type] || 'link',
                                      url: input.value.trim(),
                                      metadata: suggestion.type
                                    });
                                    input.value = '';
                                    
                                    // Show immediate success feedback
                                    const suggestionCard = input.closest('.group');
                                    if (suggestionCard) {
                                      const feedback = document.createElement('div');
                                      feedback.className = 'absolute inset-0 bg-green-100 border border-green-400 rounded flex items-center justify-center z-10 transition-all duration-300';
                                      feedback.innerHTML = '<div class="flex items-center text-green-700 font-medium text-xs"><svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added!</div>';
                                      suggestionCard.style.position = 'relative';
                                      suggestionCard.appendChild(feedback);
                                      setTimeout(() => feedback.remove(), 2000);
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const button = e.currentTarget as HTMLButtonElement;
                                const input = button.parentElement?.querySelector('input') as HTMLInputElement;
                                if (input?.value.trim()) {
                                  const typeMapping: Record<string, 'document' | 'code' | 'design' | 'data' | 'presentation' | 'link'> = {
                                    'github': 'code',
                                    'figma': 'design',
                                    'sharepoint': 'document',
                                    'onedrive': 'document',
                                    'confluence': 'document',
                                    'notion': 'document',
                                    'drive': 'data',
                                    'jira': 'link',
                                    'link': 'link'
                                  };
                                  
                                  addArtifact({
                                    name: suggestion.name,
                                    type: typeMapping[suggestion.type] || 'link',
                                    url: input.value.trim(),
                                    metadata: suggestion.type
                                  });
                                  input.value = '';
                                  
                                  // Show immediate success feedback
                                  const suggestionCard = input.closest('.group');
                                  if (suggestionCard) {
                                    const feedback = document.createElement('div');
                                    feedback.className = 'absolute inset-0 bg-green-100 border border-green-400 rounded flex items-center justify-center z-10 transition-all duration-300';
                                    feedback.innerHTML = '<div class="flex items-center text-green-700 font-medium text-xs"><svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added!</div>';
                                    suggestionCard.style.position = 'relative';
                                    suggestionCard.appendChild(feedback);
                                    setTimeout(() => feedback.remove(), 2000);
                                  }
                                }
                              }}
                              className="px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              {/* File Upload Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      📁 Upload Files
                    </h4>
                    <p className="text-xs text-gray-600">
                      Add documents, images, or other files
                    </p>
                  </div>
                  {fileArtifactsCount > 0 && (
                    <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                      {fileArtifactsCount} file{fileArtifactsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer bg-white"
                  data-upload-area
                  onClick={() => document.getElementById('fileUpload')?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-primary-400', 'bg-primary-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50');
                      const files = Array.from(e.dataTransfer.files);
                      files.forEach(handleFileUpload);
                    }}
                  >
                    <input
                      type="file"
                      id="fileUpload"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(handleFileUpload);
                        e.target.value = '';
                      }}
                    />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Click to browse files</p>
                      <p className="text-xs text-gray-500">or drag and drop files here</p>
                    </div>
                  </div>
                </div>
              </div>
                
              {/* Custom Link Section */}
              <div className="bg-purple-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      🔗 Add Custom Link
                    </h4>
                    <p className="text-xs text-gray-600">
                      Add any other relevant links or resources
                    </p>
                  </div>
                  {customLinksCount > 0 && (
                    <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                      {customLinksCount} custom link{customLinksCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-purple-200 p-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Link title (e.g., Documentation, Demo Video, etc.)"
                      className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                      id="customArtifactName"
                    />
                    <div className="flex space-x-3">
                      <input
                        type="url"
                        placeholder="https://..."
                        className="flex-1 text-sm rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
                        id="customArtifactUrl"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const nameInput = document.getElementById('customArtifactName') as HTMLInputElement;
                            const urlInput = document.getElementById('customArtifactUrl') as HTMLInputElement;
                            
                            if (nameInput?.value.trim() && urlInput?.value.trim()) {
                              addArtifact({
                                name: nameInput.value.trim(),
                                type: 'link',
                                url: urlInput.value.trim(),
                                metadata: 'custom'
                              });
                              nameInput.value = '';
                              urlInput.value = '';
                              
                              // Show immediate success feedback
                              const container = nameInput.closest('.border-t');
                              if (container) {
                                const feedback = document.createElement('div');
                                feedback.className = 'bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded mt-2 text-sm flex items-center animate-pulse';
                                feedback.innerHTML = '<svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Link added successfully!';
                                container.appendChild(feedback);
                                setTimeout(() => feedback.remove(), 3000);
                              }
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const nameInput = document.getElementById('customArtifactName') as HTMLInputElement;
                          const urlInput = document.getElementById('customArtifactUrl') as HTMLInputElement;
                          
                          if (nameInput?.value.trim() && urlInput?.value.trim()) {
                            addArtifact({
                              name: nameInput.value.trim(),
                              type: 'link',
                              url: urlInput.value.trim(),
                              metadata: 'custom'
                            });
                            nameInput.value = '';
                            urlInput.value = '';
                            
                            // Show immediate success feedback
                            const container = nameInput.closest('.border-t');
                            if (container) {
                              const feedback = document.createElement('div');
                              feedback.className = 'bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded mt-2 text-sm flex items-center animate-pulse';
                              feedback.innerHTML = '<svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Link added successfully!';
                              container.appendChild(feedback);
                              setTimeout(() => feedback.remove(), 3000);
                            }
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
                
              {/* Added Artifacts List */}
              {formData.artifacts.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">
                    Added Materials ({formData.artifacts.length})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {formData.artifacts.map((artifact) => (
                      <div key={artifact.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getArtifactIcon(artifact.type, artifact.metadata)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{artifact.name}</p>
                            <p className="text-xs text-gray-500 truncate">{artifact.url}</p>
                            </div>
                          </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArtifact(artifact.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 5 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Skills Applied</p>
            </div>
            
            <div>
              <Label.Root className="text-sm font-medium text-gray-700 mb-3 block">
                Select Skills Used *
              </Label.Root>
              {!formData.workTypes || formData.workTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Please select work types in step 3 first to see relevant skills.
                </div>
              ) : loadingSkills ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading skills...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {finalAvailableSkills.map(skill => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={cn(
                          "px-3 py-2 rounded-md text-sm transition-colors text-left",
                          formData.skillsApplied.includes(skill.id)
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                  {formData.skillsApplied.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      Selected: {formData.skillsApplied.length} skill{formData.skillsApplied.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 6 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">Team Collaboration</p>
            </div>
            
            {!formData.workspaceId ? (
              <div className="text-center py-8 text-gray-500">
                Please select a workspace in step 6 first to see team members.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Collaborators Section */}
                <div>
                  <Label.Root className="text-sm font-medium text-gray-700 mb-3 block">
                    Collaborators (Optional)
                  </Label.Root>
                  <p className="text-xs text-gray-500 mb-4">
                    Add team members who worked with you on this entry
                  </p>
                  {loadingWorkspaceMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading team members...</span>
                    </div>
                  ) : workspaceMembersError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading team members: {workspaceMembersError.message}
                    </div>
                  ) : availableMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No other team members found in this workspace.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto">
                      {availableMembers.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleCollaborator(member.userId)}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors",
                            formData.collaborators.includes(member.userId)
                              ? "bg-blue-50 border-blue-300"
                              : "border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-medium flex items-center justify-center">
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt={member.user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {member.user.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {member.user.title || member.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.collaborators.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      Selected: {formData.collaborators.length} collaborator{formData.collaborators.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Reviewers Section */}
                <div>
                  <Label.Root className="text-sm font-medium text-gray-700 mb-3 block">
                    Reviewers (Optional)
                  </Label.Root>
                  <p className="text-xs text-gray-500 mb-4">
                    Add team members who should review this entry
                  </p>
                  {loadingWorkspaceMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading team members...</span>
                    </div>
                  ) : workspaceMembersError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading team members: {workspaceMembersError.message}
                    </div>
                  ) : availableMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No other team members found in this workspace.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto">
                      {availableMembers.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleReviewer(member.userId)}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors",
                            formData.reviewers.includes(member.userId)
                              ? "bg-green-50 border-green-300"
                              : "border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-green-500 text-white text-xs font-medium flex items-center justify-center">
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt={member.user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {member.user.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {member.user.title || member.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.reviewers.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      Selected: {formData.reviewers.length} reviewer{formData.reviewers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Step 7 of {getTotalSteps()}</h2>
              <p className="text-sm text-gray-600">AI Preview & Publishing</p>
            </div>
            
            {!generatedEntries ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">🤖 Generate AI Journal Entries</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Our AI will create professional journal entries based on your input. You'll get:
                    </p>
                    <ul className="text-sm text-blue-700 text-left space-y-1 mb-4">
                      <li>• <strong>Workspace Entry:</strong> Detailed version with specific metrics and insights</li>
                      <li>• <strong>Network Entry:</strong> Professional summary suitable for public sharing</li>
                    </ul>
                    <Button
                      onClick={async () => {
                        setIsGeneratingAI(true);
                        try {
                          // Generate AI content
                          const skillNames = formData.skillsApplied.map((skillId: string) => {
                            const skill = finalAvailableSkills.find(s => s.id === skillId);
                            return skill ? skill.name : skillId;
                          });
                          
                          const workTypeNames = formData.workTypes.map((workTypeId: string) => {
                            const workType = finalWorkTypes.find(wt => wt.id === workTypeId);
                            return workType ? workType.label : workTypeId;
                          });

                          const focusAreaName = finalFocusAreas.find(fa => fa.id === formData.primaryFocusArea)?.label || formData.primaryFocusArea;
                          const workCategoryName = finalWorkCategories.find(wc => wc.id === formData.workCategory)?.label || formData.workCategory;
                          
                          const aiEntryData = {
                            title: formData.title.trim(),
                            description: formData.description.trim(),
                            result: formData.result?.trim() || '',
                            primaryFocusArea: focusAreaName,
                            workCategory: workCategoryName,
                            workTypes: workTypeNames,
                            skillsApplied: skillNames,
                            artifacts: formData.artifacts,
                            collaborators: formData.collaborators,
                            reviewers: formData.reviewers,
                            tags: [...new Set([...workTypeNames, ...formData.tags])],
                            workspaceId: formData.workspaceId,
                            projects: formData.projects,
                            departments: formData.departments
                          };

                          const generated = await generateAIMutation.mutateAsync(aiEntryData);
                          setGeneratedEntries(generated);
                        } catch (error) {
                          console.error('AI generation failed:', error);
                        } finally {
                          setIsGeneratingAI(false);
                        }
                      }}
                      disabled={isGeneratingAI}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating AI Content...
                        </>
                      ) : (
                        '🤖 Generate AI Content'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Generated Content Preview */}
                <div className="space-y-6">
                  {/* Workspace Entry Preview */}
                  <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                    {/* Header with visibility tags */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        <Briefcase className="h-3 w-3" />
                        {workspaces.find(w => w.id === formData.workspaceId)?.name || 'Workspace'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        <Shield className="h-3 w-3" />
                        Workspace Only
                      </div>
                    </div>

                    {/* User Profile Section */}
                    <div className="p-4 pb-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          {currentUser?.avatar ? (
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name || 'User'}
                              className="h-12 w-12 rounded-full border-2 border-gray-200"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-24">
                          <div className="text-base font-semibold text-gray-900 truncate">
                            {currentUser?.name || 'Your Name'}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {currentUser?.title || 'Your Title'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {workspaces.find(w => w.id === formData.workspaceId)?.organization?.name || 'Your Organization'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-24">
                          {formData.title}
                        </h3>
                      </div>
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                          {generatedEntries.workspaceEntry}
                        </div>
                      </div>

                      {/* Skills and Tags */}
                      {(formData.skillsApplied.length > 0 || formData.tags.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {formData.skillsApplied.slice(0, 5).map(skillId => {
                            const skill = finalAvailableSkills.find(s => s.id === skillId);
                            return skill ? (
                              <span key={skillId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {skill.name}
                              </span>
                            ) : null;
                          })}
                          {formData.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network Entry Preview */}
                  <div className={cn(
                    "relative rounded-lg border bg-white shadow-sm transition-all",
                    formData.isPublished ? "border-gray-200" : "border-gray-100 opacity-50 pointer-events-none"
                  )}>
                    {/* Header with toggle */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        <Briefcase className="h-3 w-3" />
                        {workspaces.find(w => w.id === formData.workspaceId)?.name || 'Workspace'}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isPublished}
                            onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                        <div className={cn(
                          "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                          formData.isPublished ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-50"
                        )}>
                          <Globe className="h-3 w-3" />
                          {formData.isPublished ? "Published" : "Not Published"}
                        </div>
                      </div>
                    </div>

                    {!formData.isPublished && (
                      <div className="absolute inset-0 bg-gray-50 bg-opacity-50 rounded-lg flex items-center justify-center z-20">
                        <div className="text-center p-4">
                          <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 font-medium">Network Publishing Disabled</p>
                          <p className="text-xs text-gray-400">Toggle above to enable network publication</p>
                        </div>
                      </div>
                    )}

                    {/* User Profile Section */}
                    <div className="p-4 pb-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          {currentUser?.avatar ? (
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name || 'User'}
                              className="h-12 w-12 rounded-full border-2 border-gray-200"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-24">
                          <div className="text-base font-semibold text-gray-900 truncate">
                            {currentUser?.name || 'Your Name'}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {currentUser?.title || 'Your Title'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              Enterprise Client
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-24">
                          {formData.title}
                        </h3>
                      </div>
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                          {generatedEntries.networkEntry}
                        </div>
                      </div>

                      {/* Skills and Tags (limited for network view) */}
                      {(formData.skillsApplied.length > 0 || formData.tags.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {formData.skillsApplied.slice(0, 3).map(skillId => {
                            const skill = finalAvailableSkills.find(s => s.id === skillId);
                            return skill ? (
                              <span key={skillId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {skill.name}
                              </span>
                            ) : null;
                          })}
                          {formData.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setGeneratedEntries(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    🔄 Regenerate AI Content
                  </Button>
                  <div className="bg-amber-50 p-4 rounded-lg flex-2">
                    <p className="text-sm text-amber-800">
                      <strong>💡 Tip:</strong> You can go back to previous steps to make changes, or regenerate the AI content with the same inputs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  const getSelectedWorkspaceName = () => {
    const workspace = workspaces.find(w => w.id === formData.workspaceId);
    return workspace ? workspace.name : '';
  };

  const getSelectedSkillNames = () => {
    return formData.skillsApplied.map(skillId => {
      const skill = finalAvailableSkills.find(s => s.id === skillId);
      return skill ? skill.name : skillId;
    });
  };

  const getSelectedCollaborators = () => {
    return formData.collaborators.map(userId => {
      const member = workspaceMembers.find(m => m.userId === userId);
      return member ? {
        id: member.userId,
        name: member.user.name,
        role: member.user.title || member.role,
        avatar: member.user.avatar || member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      } : { id: userId, name: 'Unknown User', role: '', avatar: '?' };
    });
  };

  const getSelectedReviewers = () => {
    return formData.reviewers.map(userId => {
      const member = workspaceMembers.find(m => m.userId === userId);
      return member ? {
        id: member.userId,
        name: member.user.name,
        role: member.user.title || member.role,
        avatar: member.user.avatar || member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      } : { id: userId, name: 'Unknown User', role: '', avatar: '?' };
    });
  };

  const renderPreview = () => {
    const EntryPreview = ({ type, isWorkspace = false }) => (
      <div className={cn(
        "group relative rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md",
        isWorkspace ? "border-blue-300" : "border-purple-300"
      )}>
        {/* Workspace and Publication Status Tags - Top Right */}
        <div className="absolute top-4 right-4 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 z-10">
          {/* Workspace tag */}
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
            <Briefcase className="h-3 w-3" />
            <span>{getSelectedWorkspaceName() || 'Workspace'}</span>
          </span>
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
            {formData.isPublished ? (
              <>
                <Globe className="h-3 w-3" />
                Published
              </>
            ) : (
              <>
                <Shield className="h-3 w-3" />
                Workspace Only
              </>
            )}
          </div>
        </div>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-24 sm:pr-32 lg:pr-36">
              {formData.title || "Entry Title"}
            </h3>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-3">
              {formData.description || "Entry description"}
            </p>
          </div>

          {/* Collaborators & Reviewers */}
          {(getSelectedCollaborators().length > 0 || getSelectedReviewers().length > 0) && (
            <div className="mb-4 space-y-4">
              {getSelectedCollaborators().length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                    <Users className="h-3.5 w-3.5" />
                    Collaborators ({getSelectedCollaborators().length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getSelectedCollaborators().map((collaborator) => (
                      <div 
                        key={collaborator.id} 
                        className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors group"
                      >
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
                            {collaborator.avatar && collaborator.avatar.startsWith('http') ? (
                              <img
                                src={collaborator.avatar}
                                alt={collaborator.name}
                                className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                              />
                            ) : (
                              collaborator.avatar
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                            <Users className="h-2 w-2 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {collaborator.name}
                          </h4>
                          <p className="text-xs text-blue-700 truncate">
                            {collaborator.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {getSelectedReviewers().length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                    <UserCheck className="h-3.5 w-3.5" />
                    Reviewers ({getSelectedReviewers().length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getSelectedReviewers().map((reviewer) => (
                      <div 
                        key={reviewer.id} 
                        className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors group"
                      >
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm bg-green-500 text-white text-xs font-medium flex items-center justify-center">
                            {reviewer.avatar && reviewer.avatar.startsWith('http') ? (
                              <img
                                src={reviewer.avatar}
                                alt={reviewer.name}
                                className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                              />
                            ) : (
                              reviewer.avatar
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <UserCheck className="h-2 w-2 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {reviewer.name}
                          </h4>
                          <p className="text-xs text-green-700 truncate">
                            {reviewer.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {getSelectedSkillNames().length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {getSelectedSkillNames().map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes & Results */}
          {formData.result && (
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                <Star className="h-3.5 w-3.5" />
                Outcomes & Results
              </span>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <div className="flex-shrink-0">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      Results & Outcomes
                    </h4>
                    <p className="text-sm text-yellow-800">
                      {formData.result}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Artifacts - Only show in workspace entries */}
          {isWorkspace && formData.artifacts.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                <Link className="h-3.5 w-3.5" />
                Artifacts & Resources ({formData.artifacts.length})
              </span>
              <div className="space-y-2">
                {formData.artifacts.map((artifact) => (
                  <div 
                    key={artifact.id} 
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getArtifactIcon(artifact.type, artifact.metadata)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {artifact.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {artifact.metadata || artifact.type} • {artifact.url}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    if (formData.isPublished) {
      return (
        <div className="space-y-6">
          {/* Workspace Entry */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-blue-900 uppercase tracking-wide">Workspace Entry Preview</h4>
            <EntryPreview type="workspace" isWorkspace={true} />
          </div>
          
          {/* Network Entry */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-purple-900 uppercase tracking-wide">Network Entry Preview</h4>
            <EntryPreview type="network" isWorkspace={false} />
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-blue-900 uppercase tracking-wide">Workspace Entry Preview</h4>
          <EntryPreview type="workspace" isWorkspace={true} />
        </div>
      );
    }
  };

  if (submitSuccess) {
    return (
      <>
        {/* Overlay */}
        {open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => onOpenChange(false)} />
        )}
        
        {/* Success Side Panel */}
        <div className={cn(
          "fixed top-0 right-0 h-full w-1/2 max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col items-center justify-center",
          open ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="text-center p-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              Entry Created Successfully!
            </h3>
            <p className="text-sm text-gray-500">
              Your journal entry has been created and saved.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => onOpenChange(false)} />
      )}
      
      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-1/2 max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h1 className="text-xl font-semibold text-gray-900">
            Create New Journal Entry
          </h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of {getTotalSteps()}
            </span>
            <div className="flex space-x-1">
              {Array.from({ length: getTotalSteps() }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-8 rounded-full",
                    i + 1 <= step ? "bg-primary-500" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAutoAdvancing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2 text-primary-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="text-sm font-medium">Moving to next step...</span>
              </div>
            </div>
          )}
          {showPreview ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Preview</h3>
              {renderPreview()}
            </div>
          ) : (
            renderStep()
          )}
          
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || showPreview}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          <div className="flex space-x-2">
            {!showPreview && step < getTotalSteps() && (
              (step > 2) || 
              (step === 1 && formData.primaryFocusArea === '99-others') ||
              (step === 2 && formData.workCategory?.endsWith('-others'))
            ) && (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
            {!showPreview && step === getTotalSteps() && generatedEntries && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                {isSubmitting ? 'Creating Entries...' : 
                 `Create ${formData.isPublished ? 'Workspace & Network' : 'Workspace'} Entry`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NewEntryModal;