import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth.utils';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Primary Focus Areas (11 total)
const primaryFocusAreas = [
  { id: 'development', label: 'Development', description: 'Software development and engineering' },
  { id: 'design', label: 'Design', description: 'User experience and visual design' },
  { id: 'product-management', label: 'Product Management', description: 'Product strategy and management' },
  { id: 'marketing', label: 'Marketing', description: 'Marketing and brand management' },
  { id: 'sales', label: 'Sales', description: 'Sales and business development' },
  { id: 'operations', label: 'Operations', description: 'Business operations and process management' },
  { id: 'leadership', label: 'Leadership', description: 'Team leadership and management' },
  { id: 'strategy', label: 'Strategy', description: 'Strategic planning and analysis' },
  { id: 'finance', label: 'Finance', description: 'Financial planning and analysis' },
  { id: 'legal', label: 'Legal', description: 'Legal and compliance' },
  { id: 'hr', label: 'HR', description: 'Human resources and talent management' }
];

// Complete Work Categories organized by focus area (11 focus areas, 167 work types)
const workCategories = {
  'development': [
    {
      id: 'frontend',
      label: 'Frontend',
      workTypes: [
        { id: 'ui-implementation', label: 'UI Implementation' },
        { id: 'state-management', label: 'State Management' },
        { id: 'frontend-performance', label: 'Frontend Performance' },
        { id: 'user-experience-logic', label: 'User Experience Logic' },
        { id: 'animations-transitions', label: 'Animations & Transitions' },
        { id: 'responsive-design', label: 'Responsive Design Implementation' },
        { id: 'cross-browser-compatibility', label: 'Cross-Browser Compatibility' },
        { id: 'frontend-accessibility', label: 'Frontend Accessibility' }
      ]
    },
    {
      id: 'backend',
      label: 'Backend',
      workTypes: [
        { id: 'api-development', label: 'API Development' },
        { id: 'database-work', label: 'Database Work' },
        { id: 'business-logic', label: 'Business Logic' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'authentication-authorization', label: 'Authentication & Authorization' },
        { id: 'caching-strategies', label: 'Caching Strategies' },
        { id: 'background-jobs', label: 'Background Jobs & Queues' },
        { id: 'microservices', label: 'Microservices Development' }
      ]
    },
    {
      id: 'architecture',
      label: 'Architecture',
      workTypes: [
        { id: 'system-design', label: 'System Design' },
        { id: 'technical-debt', label: 'Technical Debt' },
        { id: 'security-implementation', label: 'Security Implementation' },
        { id: 'performance-optimization', label: 'Performance Optimization' },
        { id: 'scalability-planning', label: 'Scalability Planning' },
        { id: 'architecture-patterns', label: 'Architecture Patterns' },
        { id: 'api-gateway-design', label: 'API Gateway Design' },
        { id: 'data-architecture', label: 'Data Architecture' }
      ]
    },
    {
      id: 'devops',
      label: 'DevOps',
      workTypes: [
        { id: 'ci-cd-pipeline', label: 'CI/CD Pipeline' },
        { id: 'environment-setup', label: 'Environment Setup' },
        { id: 'monitoring-logging', label: 'Monitoring/Logging' },
        { id: 'deployment', label: 'Deployment' },
        { id: 'containerization', label: 'Containerization' },
        { id: 'infrastructure-as-code', label: 'Infrastructure as Code' },
        { id: 'cloud-configuration', label: 'Cloud Configuration' },
        { id: 'security-automation', label: 'Security Automation' }
      ]
    },
    {
      id: 'mobile',
      label: 'Mobile Development',
      workTypes: [
        { id: 'native-ios', label: 'Native iOS Development' },
        { id: 'native-android', label: 'Native Android Development' },
        { id: 'cross-platform', label: 'Cross-Platform Development' },
        { id: 'mobile-ui', label: 'Mobile UI Implementation' },
        { id: 'mobile-performance', label: 'Mobile Performance Optimization' },
        { id: 'mobile-offline-support', label: 'Offline Support & Sync' },
        { id: 'mobile-security', label: 'Mobile Security' },
        { id: 'app-store-deployment', label: 'App Store Deployment' }
      ]
    },
    {
      id: 'testing',
      label: 'Development Testing',
      workTypes: [
        { id: 'unit-testing', label: 'Unit Testing' },
        { id: 'integration-testing', label: 'Integration Testing' },
        { id: 'e2e-testing', label: 'End-to-End Testing' },
        { id: 'performance-testing', label: 'Performance Testing' },
        { id: 'security-testing', label: 'Security Testing' },
        { id: 'test-automation', label: 'Test Automation Framework' },
        { id: 'snapshot-testing', label: 'Snapshot Testing' },
        { id: 'accessibility-testing', label: 'Accessibility Testing' }
      ]
    },
    {
      id: 'documentation',
      label: 'Code Documentation',
      workTypes: [
        { id: 'api-documentation', label: 'API Documentation' },
        { id: 'code-comments', label: 'Code Comments & Annotations' },
        { id: 'developer-guides', label: 'Developer Guides' },
        { id: 'architecture-documentation', label: 'Architecture Documentation' },
        { id: 'onboarding-documentation', label: 'Developer Onboarding Docs' },
        { id: 'system-diagrams', label: 'System Diagrams' },
        { id: 'code-standards', label: 'Code Standards Documentation' },
        { id: 'release-notes', label: 'Release Notes' }
      ]
    },
    {
      id: 'data-engineering',
      label: 'Data Engineering',
      workTypes: [
        { id: 'etl-pipelines', label: 'ETL Pipeline Development' },
        { id: 'data-warehousing', label: 'Data Warehousing' },
        { id: 'data-modeling', label: 'Data Modeling' },
        { id: 'data-migration', label: 'Data Migration' },
        { id: 'big-data-processing', label: 'Big Data Processing' },
        { id: 'data-quality', label: 'Data Quality & Validation' },
        { id: 'analytics-implementation', label: 'Analytics Implementation' },
        { id: 'realtime-data-pipelines', label: 'Real-time Data Pipelines' }
      ]
    }
  ],
  'design': [
    {
      id: 'research',
      label: 'User Research',
      workTypes: [
        { id: 'user-interviews', label: 'User Interviews' },
        { id: 'usability-testing', label: 'Usability Testing' },
        { id: 'heuristic-evaluation', label: 'Heuristic Evaluation' },
        { id: 'competitive-ux-analysis', label: 'Competitive UX Analysis' },
        { id: 'user-surveys', label: 'User Surveys & Questionnaires' },
        { id: 'field-studies', label: 'Field Studies & Contextual Inquiry' },
        { id: 'diary-studies', label: 'Diary Studies' },
        { id: 'analytics-review', label: 'Analytics Review & Insights' }
      ]
    },
    {
      id: 'planning',
      label: 'UX Planning',
      workTypes: [
        { id: 'user-flows', label: 'User Flows' },
        { id: 'information-architecture', label: 'Information Architecture' },
        { id: 'journey-mapping', label: 'Journey Mapping' },
        { id: 'ux-strategy', label: 'UX Strategy' },
        { id: 'content-strategy', label: 'Content Strategy' },
        { id: 'user-personas', label: 'User Personas' },
        { id: 'use-cases', label: 'Use Cases & Scenarios' },
        { id: 'storyboarding', label: 'UX Storyboarding' }
      ]
    },
    {
      id: 'interaction',
      label: 'Interaction Design',
      workTypes: [
        { id: 'wireframing', label: 'Wireframing' },
        { id: 'prototyping', label: 'Prototyping' },
        { id: 'interaction-design', label: 'Interaction Patterns' },
        { id: 'accessibility-design', label: 'Accessibility Design' },
        { id: 'gesture-design', label: 'Gesture & Touch Design' },
        { id: 'animation-design', label: 'Animation & Motion Design' },
        { id: 'responsive-design-planning', label: 'Responsive Design Planning' },
        { id: 'form-design', label: 'Form & Input Design' }
      ]
    },
    {
      id: 'visual-design',
      label: 'Visual Design',
      workTypes: [
        { id: 'ui-mockups', label: 'UI Mockups' },
        { id: 'style-guide-creation', label: 'Style Guide Creation' },
        { id: 'iconography', label: 'Iconography' },
        { id: 'illustration', label: 'Illustration' },
        { id: 'typography', label: 'Typography' },
        { id: 'color-systems', label: 'Color Systems' },
        { id: 'branding-elements', label: 'Branding Elements' },
        { id: 'data-visualization', label: 'Data Visualization Design' }
      ]
    },
    {
      id: 'design-systems',
      label: 'Design Systems',
      workTypes: [
        { id: 'component-design', label: 'Component Design' },
        { id: 'pattern-library', label: 'Pattern Library' },
        { id: 'design-tokens', label: 'Design Tokens' },
        { id: 'system-documentation', label: 'System Documentation' },
        { id: 'design-system-governance', label: 'Design System Governance' },
        { id: 'component-variants', label: 'Component Variants & States' },
        { id: 'system-adoption', label: 'System Adoption & Advocacy' },
        { id: 'system-versioning', label: 'System Versioning & Updates' }
      ]
    },
    {
      id: 'collaboration',
      label: 'Design Collaboration',
      workTypes: [
        { id: 'design-reviews', label: 'Design Reviews & Critiques' },
        { id: 'handoff-to-ui-design', label: 'Handoff to Development' },
        { id: 'developer-collaboration', label: 'Developer Collaboration' },
        { id: 'stakeholder-presentations', label: 'Stakeholder Presentations' },
        { id: 'design-workshops', label: 'Design Workshops & Facilitation' },
        { id: 'cross-functional-alignment', label: 'Cross-functional Alignment' },
        { id: 'design-documentation', label: 'Design Documentation' },
        { id: 'design-advocacy', label: 'Design Advocacy' }
      ]
    },
    {
      id: 'specialized-design',
      label: 'Specialized Design',
      workTypes: [
        { id: 'mobile-design', label: 'Mobile App Design' },
        { id: 'responsive-web-design', label: 'Responsive Web Design' },
        { id: 'design-for-print', label: 'Design for Print' },
        { id: 'email-design', label: 'Email Design' },
        { id: 'landing-page-design', label: 'Landing Page Design' },
        { id: 'dashboard-design', label: 'Dashboard Design' },
        { id: 'video-motion-graphics', label: 'Video & Motion Graphics' },
        { id: 'conversational-design', label: 'Conversational UI Design' }
      ]
    },
    {
      id: 'design-testing',
      label: 'Design Testing & Validation',
      workTypes: [
        { id: 'a-b-testing', label: 'A/B Testing' },
        { id: 'usability-studies', label: 'Usability Studies' },
        { id: 'design-validation', label: 'Design Validation Research' },
        { id: 'concept-testing', label: 'Concept Testing' },
        { id: 'preference-testing', label: 'Preference Testing' },
        { id: 'benchmark-testing', label: 'Benchmark Testing' },
        { id: 'first-click-testing', label: 'First-Click Testing' },
        { id: 'eye-tracking', label: 'Eye Tracking Studies' }
      ]
    }
  ],
  'product-management': [
    {
      id: 'strategy',
      label: 'Product Strategy',
      workTypes: [
        { id: 'market-research', label: 'Market Research' },
        { id: 'roadmap-planning', label: 'Roadmap Planning' },
        { id: 'okr-goal-setting', label: 'OKR/Goal Setting' },
        { id: 'business-case-development', label: 'Business Case Development' },
        { id: 'competitive-analysis', label: 'Competitive Analysis' },
        { id: 'pricing-strategy', label: 'Pricing Strategy' },
        { id: 'vision-definition', label: 'Product Vision Definition' },
        { id: 'go-to-market-strategy', label: 'Go-to-Market Strategy' }
      ]
    },
    {
      id: 'discovery',
      label: 'Product Discovery',
      workTypes: [
        { id: 'customer-interviews', label: 'Customer Interviews' },
        { id: 'problem-validation', label: 'Problem Validation' },
        { id: 'solution-exploration', label: 'Solution Exploration' },
        { id: 'opportunity-assessment', label: 'Opportunity Assessment' },
        { id: 'design-sprints', label: 'Design Sprints' },
        { id: 'concept-validation', label: 'Concept Validation' },
        { id: 'prototype-testing', label: 'Prototype Testing' },
        { id: 'user-feedback-analysis', label: 'User Feedback Analysis' }
      ]
    },
    {
      id: 'requirements',
      label: 'Requirements',
      workTypes: [
        { id: 'user-story-creation', label: 'User Story Creation' },
        { id: 'feature-specification', label: 'Feature Specification' },
        { id: 'backlog-grooming', label: 'Backlog Grooming' },
        { id: 'customer-research-review', label: 'Customer Research Review' },
        { id: 'acceptance-criteria', label: 'Acceptance Criteria Definition' },
        { id: 'story-mapping', label: 'Story Mapping' },
        { id: 'prioritization', label: 'Feature Prioritization' },
        { id: 'technical-requirement-definition', label: 'Technical Requirement Definition' }
      ]
    },
    {
      id: 'execution',
      label: 'Product Execution',
      workTypes: [
        { id: 'sprint-planning', label: 'Sprint Planning' },
        { id: 'stakeholder-communication', label: 'Stakeholder Communication' },
        { id: 'cross-functional-coordination', label: 'Cross-functional Coordination' },
        { id: 'release-management', label: 'Release Management' },
        { id: 'issue-triage', label: 'Issue Triage & Resolution' },
        { id: 'decision-making', label: 'Decision Making & Trade-offs' },
        { id: 'development-support', label: 'Development Support' },
        { id: 'qa-coordination', label: 'QA Coordination' }
      ]
    },
    {
      id: 'analysis',
      label: 'Product Analysis',
      workTypes: [
        { id: 'feature-performance-analysis', label: 'Feature Performance Analysis' },
        { id: 'customer-feedback-analysis', label: 'Customer Feedback Analysis' },
        { id: 'competitive-analysis-detailed', label: 'Competitive Analysis' },
        { id: 'ab-test-review', label: 'A/B Test Review' },
        { id: 'metrics-definition', label: 'Metrics Definition & Tracking' },
        { id: 'funnel-analysis', label: 'Funnel Analysis' },
        { id: 'retention-analysis', label: 'Retention Analysis' },
        { id: 'revenue-analysis', label: 'Revenue & Business Impact Analysis' }
      ]
    },
    {
      id: 'documentation',
      label: 'Product Documentation',
      workTypes: [
        { id: 'product-requirements-document', label: 'Product Requirements Document' },
        { id: 'user-guides', label: 'User Guides & Manuals' },
        { id: 'product-presentations', label: 'Product Presentations' },
        { id: 'feature-announcements', label: 'Feature Announcements' },
        { id: 'knowledge-base-articles', label: 'Knowledge Base Articles' },
        { id: 'sales-enablement-materials', label: 'Sales Enablement Materials' },
        { id: 'product-videos', label: 'Product Videos & Demos' },
        { id: 'internal-documentation', label: 'Internal Product Documentation' }
      ]
    },
    {
      id: 'customer-success',
      label: 'Customer Success',
      workTypes: [
        { id: 'customer-onboarding', label: 'Customer Onboarding' },
        { id: 'training-materials', label: 'Training Materials' },
        { id: 'customer-support', label: 'Customer Support Coordination' },
        { id: 'account-management', label: 'Account Management Support' },
        { id: 'customer-advocacy', label: 'Customer Advocacy Programs' },
        { id: 'customer-feedback-collection', label: 'Customer Feedback Collection' },
        { id: 'success-metrics-tracking', label: 'Success Metrics Tracking' },
        { id: 'churn-prevention', label: 'Churn Prevention Initiatives' }
      ]
    },
    {
      id: 'product-growth',
      label: 'Product Growth',
      workTypes: [
        { id: 'growth-experiments', label: 'Growth Experiments' },
        { id: 'user-acquisition', label: 'User Acquisition Strategy' },
        { id: 'engagement-strategies', label: 'Engagement Strategies' },
        { id: 'virality-features', label: 'Virality Features' },
        { id: 'monetization-optimization', label: 'Monetization Optimization' },
        { id: 'referral-programs', label: 'Referral Programs' },
        { id: 'channel-optimization', label: 'Channel Optimization' },
        { id: 'conversion-rate-optimization', label: 'Conversion Rate Optimization' }
      ]
    }
  ],
  'marketing': [
    {
      id: 'strategy',
      label: 'Marketing Strategy',
      workTypes: [
        { id: 'campaign-planning', label: 'Campaign Planning' },
        { id: 'market-research-mktg', label: 'Market Research' },
        { id: 'brand-development', label: 'Brand Development' },
        { id: 'product-marketing', label: 'Product Marketing' },
        { id: 'audience-segmentation', label: 'Audience Segmentation' },
        { id: 'competitive-positioning', label: 'Competitive Positioning' },
        { id: 'marketing-budget-planning', label: 'Marketing Budget Planning' },
        { id: 'marketing-analytics-strategy', label: 'Marketing Analytics Strategy' }
      ]
    },
    {
      id: 'content',
      label: 'Content Marketing',
      workTypes: [
        { id: 'content-creation', label: 'Content Creation' },
        { id: 'blog-management', label: 'Blog Management' },
        { id: 'case-studies', label: 'Case Studies' },
        { id: 'whitepapers-ebooks', label: 'Whitepapers/eBooks' },
        { id: 'content-strategy', label: 'Content Strategy' },
        { id: 'editorial-calendar', label: 'Editorial Calendar Management' },
        { id: 'content-distribution', label: 'Content Distribution' },
        { id: 'content-performance-analysis', label: 'Content Performance Analysis' }
      ]
    },
    {
      id: 'digital',
      label: 'Digital Marketing',
      workTypes: [
        { id: 'website-management', label: 'Website Management' },
        { id: 'email-marketing', label: 'Email Marketing' },
        { id: 'social-media', label: 'Social Media Marketing' },
        { id: 'seo-sem', label: 'SEO/SEM' },
        { id: 'ppc-campaign-management', label: 'PPC Campaign Management' },
        { id: 'marketing-automation', label: 'Marketing Automation' },
        { id: 'landing-page-optimization', label: 'Landing Page Optimization' },
        { id: 'digital-analytics', label: 'Digital Analytics' }
      ]
    },
    {
      id: 'events',
      label: 'Event Marketing',
      workTypes: [
        { id: 'webinar-management', label: 'Webinar Management' },
        { id: 'conference-planning', label: 'Conference Planning' },
        { id: 'customer-events', label: 'Customer Events' },
        { id: 'partner-marketing', label: 'Partner Marketing' },
        { id: 'trade-show-management', label: 'Trade Show Management' },
        { id: 'virtual-events', label: 'Virtual Events' },
        { id: 'event-logistics', label: 'Event Logistics' },
        { id: 'event-roi-analysis', label: 'Event ROI Analysis' }
      ]
    },
    {
      id: 'product-marketing',
      label: 'Product Marketing',
      workTypes: [
        { id: 'product-positioning', label: 'Product Positioning' },
        { id: 'product-messaging', label: 'Product Messaging' },
        { id: 'go-to-market-planning', label: 'Go-to-Market Planning' },
        { id: 'product-launches', label: 'Product Launches' },
        { id: 'sales-enablement', label: 'Sales Enablement' },
        { id: 'competitive-intelligence', label: 'Competitive Intelligence' },
        { id: 'product-adoption', label: 'Product Adoption Campaigns' },
        { id: 'customer-marketing', label: 'Customer Marketing' }
      ]
    },
    {
      id: 'brand',
      label: 'Brand Management',
      workTypes: [
        { id: 'brand-strategy', label: 'Brand Strategy' },
        { id: 'brand-guidelines', label: 'Brand Guidelines' },
        { id: 'brand-assets', label: 'Brand Assets Development' },
        { id: 'brand-voice', label: 'Brand Voice & Messaging' },
        { id: 'rebranding-initiatives', label: 'Rebranding Initiatives' },
        { id: 'brand-monitoring', label: 'Brand Monitoring' },
        { id: 'brand-awareness', label: 'Brand Awareness Campaigns' },
        { id: 'brand-partnerships', label: 'Brand Partnerships' }
      ]
    },
    {
      id: 'creative',
      label: 'Creative Services',
      workTypes: [
        { id: 'design-production', label: 'Design & Production' },
        { id: 'video-production', label: 'Video Production' },
        { id: 'copywriting', label: 'Copywriting' },
        { id: 'creative-direction', label: 'Creative Direction' },
        { id: 'creative-campaign-development', label: 'Creative Campaign Development' },
        { id: 'asset-creation', label: 'Marketing Asset Creation' },
        { id: 'photography-direction', label: 'Photography Direction' },
        { id: 'design-system-marketing', label: 'Marketing Design System' }
      ]
    },
    {
      id: 'growth',
      label: 'Growth Marketing',
      workTypes: [
        { id: 'acquisition-strategy', label: 'Acquisition Strategy' },
        { id: 'conversion-optimization', label: 'Conversion Optimization' },
        { id: 'a-b-testing-program', label: 'A/B Testing Program' },
        { id: 'funnel-optimization', label: 'Funnel Optimization' },
        { id: 'referral-marketing', label: 'Referral Marketing' },
        { id: 'growth-experimentation', label: 'Growth Experimentation' },
        { id: 'retention-marketing', label: 'Retention Marketing' },
        { id: 'marketing-analytics-growth', label: 'Marketing Analytics for Growth' }
      ]
    }
  ],
  'sales': [
    {
      id: 'prospecting',
      label: 'Sales Prospecting',
      workTypes: [
        { id: 'lead-generation', label: 'Lead Generation' },
        { id: 'account-research', label: 'Account Research' },
        { id: 'outreach-campaigns', label: 'Outreach Campaigns' },
        { id: 'networking', label: 'Networking' },
        { id: 'prospect-qualification', label: 'Prospect Qualification' },
        { id: 'cold-calling', label: 'Cold Calling' },
        { id: 'social-selling', label: 'Social Selling' },
        { id: 'lead-nurturing', label: 'Lead Nurturing' }
      ]
    },
    {
      id: 'opportunity-management',
      label: 'Opportunity Management',
      workTypes: [
        { id: 'discovery-calls', label: 'Discovery Calls' },
        { id: 'solution-design', label: 'Solution Design' },
        { id: 'proposal-development', label: 'Proposal Development' },
        { id: 'negotiations', label: 'Negotiations' },
        { id: 'demo-presentations', label: 'Demo & Presentations' },
        { id: 'objection-handling', label: 'Objection Handling' },
        { id: 'value-proposition', label: 'Value Proposition Communication' },
        { id: 'closing-techniques', label: 'Closing Techniques' }
      ]
    },
    {
      id: 'account-management',
      label: 'Account Management',
      workTypes: [
        { id: 'customer-meetings', label: 'Customer Meetings' },
        { id: 'relationship-building', label: 'Relationship Building' },
        { id: 'upsell-cross-sell', label: 'Upsell/Cross-sell' },
        { id: 'renewal-management', label: 'Renewal Management' },
        { id: 'account-planning', label: 'Account Planning' },
        { id: 'executive-relationship', label: 'Executive Relationship Management' },
        { id: 'customer-success-coordination', label: 'Customer Success Coordination' },
        { id: 'account-health-monitoring', label: 'Account Health Monitoring' }
      ]
    },
    {
      id: 'sales-operations',
      label: 'Sales Operations',
      workTypes: [
        { id: 'forecasting', label: 'Forecasting' },
        { id: 'crm-management', label: 'CRM Management' },
        { id: 'competitive-analysis-sales', label: 'Competitive Analysis' },
        { id: 'sales-enablement-toolkit', label: 'Sales Enablement' },
        { id: 'sales-process-optimization', label: 'Sales Process Optimization' },
        { id: 'territory-management', label: 'Territory Management' },
        { id: 'sales-analytics', label: 'Sales Analytics' },
        { id: 'sales-tool-implementation', label: 'Sales Tool Implementation' }
      ]
    }
  ],
  'operations': [
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      workTypes: [
        { id: 'cloud-architecture', label: 'Cloud Architecture' },
        { id: 'server-management', label: 'Server Management' },
        { id: 'network-configuration', label: 'Network Configuration' },
        { id: 'database-operations', label: 'Database Operations' },
        { id: 'storage-management', label: 'Storage Management' },
        { id: 'compute-optimization', label: 'Compute Optimization' },
        { id: 'virtualization', label: 'Virtualization' },
        { id: 'clustering-high-availability', label: 'Clustering & High Availability' }
      ]
    },
    {
      id: 'pipelines',
      label: 'DevOps Pipelines',
      workTypes: [
        { id: 'ci-pipeline-development', label: 'CI Pipeline Development' },
        { id: 'cd-pipeline-development', label: 'CD Pipeline Development' },
        { id: 'pipeline-monitoring', label: 'Pipeline Monitoring' },
        { id: 'pipeline-optimization', label: 'Pipeline Optimization' },
        { id: 'build-automation', label: 'Build Automation' },
        { id: 'artifact-management', label: 'Artifact Management' },
        { id: 'environment-provisioning', label: 'Environment Provisioning' },
        { id: 'release-orchestration', label: 'Release Orchestration' }
      ]
    }
  ],
  'finance': [
    {
      id: 'accounting',
      label: 'Accounting',
      workTypes: [
        { id: 'financial-reporting', label: 'Financial Reporting' },
        { id: 'accounts-payable', label: 'Accounts Payable' },
        { id: 'accounts-receivable', label: 'Accounts Receivable' },
        { id: 'general-ledger', label: 'General Ledger' },
        { id: 'month-end-close', label: 'Month-End Close' },
        { id: 'fixed-assets', label: 'Fixed Assets Management' },
        { id: 'accounting-systems', label: 'Accounting Systems Management' },
        { id: 'financial-controls', label: 'Financial Controls' }
      ]
    }
  ],
  'hr': [
    {
      id: 'talent-acquisition',
      label: 'Talent Acquisition',
      workTypes: [
        { id: 'recruitment', label: 'Recruitment' },
        { id: 'employer-branding', label: 'Employer Branding' },
        { id: 'onboarding-hr', label: 'Onboarding' },
        { id: 'workforce-planning', label: 'Workforce Planning' },
        { id: 'recruiting-strategy', label: 'Recruiting Strategy' },
        { id: 'candidate-experience', label: 'Candidate Experience' },
        { id: 'interview-process', label: 'Interview Process Design' },
        { id: 'sourcing-strategy', label: 'Sourcing Strategy' }
      ]
    }
  ],
  'legal': [
    {
      id: 'contract-management',
      label: 'Contract Management',
      workTypes: [
        { id: 'contract-drafting', label: 'Contract Drafting' },
        { id: 'contract-negotiation', label: 'Contract Negotiation' },
        { id: 'contract-review', label: 'Contract Review' },
        { id: 'template-development', label: 'Contract Template Development' },
        { id: 'contract-lifecycle', label: 'Contract Lifecycle Management' },
        { id: 'vendor-contracts', label: 'Vendor Contracts' },
        { id: 'customer-contracts', label: 'Customer Contracts' },
        { id: 'employment-contracts', label: 'Employment Contracts' }
      ]
    }
  ]
};

// Complete skills array (174 skills across Technical, Design, Professional, and Soft categories)
const skills = [
  // Programming Languages
  { id: 'javascript', name: 'JavaScript', category: 'Technical' },
  { id: 'typescript', name: 'TypeScript', category: 'Technical' },
  { id: 'python', name: 'Python', category: 'Technical' },
  { id: 'java', name: 'Java', category: 'Technical' },
  { id: 'csharp', name: 'C#', category: 'Technical' },
  { id: 'go', name: 'Go', category: 'Technical' },
  { id: 'ruby', name: 'Ruby', category: 'Technical' },
  { id: 'php', name: 'PHP', category: 'Technical' },
  { id: 'swift', name: 'Swift', category: 'Technical' },
  { id: 'kotlin', name: 'Kotlin', category: 'Technical' },
  { id: 'dart', name: 'Dart', category: 'Technical' },
  { id: 'rust', name: 'Rust', category: 'Technical' },
  { id: 'scala', name: 'Scala', category: 'Technical' },
  { id: 'cpp', name: 'C++', category: 'Technical' },
  { id: 'c', name: 'C', category: 'Technical' },

  // Web Technologies
  { id: 'html5', name: 'HTML5', category: 'Technical' },
  { id: 'css3', name: 'CSS3', category: 'Technical' },
  { id: 'sass', name: 'SASS/SCSS', category: 'Technical' },
  { id: 'less', name: 'LESS', category: 'Technical' },
  { id: 'webpack', name: 'Webpack', category: 'Technical' },
  { id: 'vite', name: 'Vite', category: 'Technical' },
  { id: 'babel', name: 'Babel', category: 'Technical' },

  // Frontend Frameworks & Libraries
  { id: 'react', name: 'React', category: 'Technical' },
  { id: 'vue', name: 'Vue.js', category: 'Technical' },
  { id: 'angular', name: 'Angular', category: 'Technical' },
  { id: 'svelte', name: 'Svelte', category: 'Technical' },
  { id: 'nextjs', name: 'Next.js', category: 'Technical' },
  { id: 'nuxtjs', name: 'Nuxt.js', category: 'Technical' },
  { id: 'gatsby', name: 'Gatsby', category: 'Technical' },
  { id: 'remix', name: 'Remix', category: 'Technical' },
  { id: 'alpine', name: 'Alpine.js', category: 'Technical' },
  { id: 'jquery', name: 'jQuery', category: 'Technical' },

  // Backend Frameworks
  { id: 'nodejs', name: 'Node.js', category: 'Technical' },
  { id: 'express', name: 'Express.js', category: 'Technical' },
  { id: 'nestjs', name: 'NestJS', category: 'Technical' },
  { id: 'fastify', name: 'Fastify', category: 'Technical' },
  { id: 'django', name: 'Django', category: 'Technical' },
  { id: 'flask', name: 'Flask', category: 'Technical' },
  { id: 'fastapi', name: 'FastAPI', category: 'Technical' },
  { id: 'spring', name: 'Spring Boot', category: 'Technical' },
  { id: 'rails', name: 'Ruby on Rails', category: 'Technical' },
  { id: 'laravel', name: 'Laravel', category: 'Technical' },
  { id: 'symfony', name: 'Symfony', category: 'Technical' },
  { id: 'gin', name: 'Gin (Go)', category: 'Technical' },
  { id: 'fiber', name: 'Fiber (Go)', category: 'Technical' },
  { id: 'aspnet', name: 'ASP.NET Core', category: 'Technical' },

  // Mobile Development
  { id: 'ios-dev', name: 'iOS Development', category: 'Technical' },
  { id: 'android-dev', name: 'Android Development', category: 'Technical' },
  { id: 'react-native', name: 'React Native', category: 'Technical' },
  { id: 'flutter', name: 'Flutter', category: 'Technical' },
  { id: 'ionic', name: 'Ionic', category: 'Technical' },
  { id: 'xamarin', name: 'Xamarin', category: 'Technical' },
  { id: 'cordova', name: 'Apache Cordova', category: 'Technical' },

  // Databases
  { id: 'postgresql', name: 'PostgreSQL', category: 'Technical' },
  { id: 'mysql', name: 'MySQL', category: 'Technical' },
  { id: 'mongodb', name: 'MongoDB', category: 'Technical' },
  { id: 'redis', name: 'Redis', category: 'Technical' },
  { id: 'sqlite', name: 'SQLite', category: 'Technical' },
  { id: 'cassandra', name: 'Cassandra', category: 'Technical' },
  { id: 'dynamodb', name: 'DynamoDB', category: 'Technical' },
  { id: 'elasticsearch', name: 'Elasticsearch', category: 'Technical' },
  { id: 'neo4j', name: 'Neo4j', category: 'Technical' },
  { id: 'influxdb', name: 'InfluxDB', category: 'Technical' },

  // Cloud Platforms
  { id: 'aws', name: 'Amazon Web Services', category: 'Technical' },
  { id: 'azure', name: 'Microsoft Azure', category: 'Technical' },
  { id: 'gcp', name: 'Google Cloud Platform', category: 'Technical' },
  { id: 'digitalocean', name: 'DigitalOcean', category: 'Technical' },
  { id: 'heroku', name: 'Heroku', category: 'Technical' },
  { id: 'vercel', name: 'Vercel', category: 'Technical' },
  { id: 'netlify', name: 'Netlify', category: 'Technical' },

  // DevOps & Infrastructure
  { id: 'docker', name: 'Docker', category: 'Technical' },
  { id: 'kubernetes', name: 'Kubernetes', category: 'Technical' },
  { id: 'terraform', name: 'Terraform', category: 'Technical' },
  { id: 'ansible', name: 'Ansible', category: 'Technical' },
  { id: 'jenkins', name: 'Jenkins', category: 'Technical' },
  { id: 'github-actions', name: 'GitHub Actions', category: 'Technical' },
  { id: 'gitlab-ci', name: 'GitLab CI/CD', category: 'Technical' },
  { id: 'circleci', name: 'CircleCI', category: 'Technical' },
  { id: 'nginx', name: 'Nginx', category: 'Technical' },
  { id: 'apache', name: 'Apache', category: 'Technical' },

  // Design Tools
  { id: 'figma', name: 'Figma', category: 'Design' },
  { id: 'sketch', name: 'Sketch', category: 'Design' },
  { id: 'adobe-xd', name: 'Adobe XD', category: 'Design' },
  { id: 'photoshop', name: 'Adobe Photoshop', category: 'Design' },
  { id: 'illustrator', name: 'Adobe Illustrator', category: 'Design' },
  { id: 'indesign', name: 'Adobe InDesign', category: 'Design' },
  { id: 'after-effects', name: 'Adobe After Effects', category: 'Design' },
  { id: 'principle', name: 'Principle', category: 'Design' },
  { id: 'framer', name: 'Framer', category: 'Design' },
  { id: 'invision', name: 'InVision', category: 'Design' },

  // Data & Analytics
  { id: 'sql', name: 'SQL', category: 'Technical' },
  { id: 'pandas', name: 'Pandas', category: 'Technical' },
  { id: 'numpy', name: 'NumPy', category: 'Technical' },
  { id: 'scikit-learn', name: 'Scikit-learn', category: 'Technical' },
  { id: 'tensorflow', name: 'TensorFlow', category: 'Technical' },
  { id: 'pytorch', name: 'PyTorch', category: 'Technical' },
  { id: 'spark', name: 'Apache Spark', category: 'Technical' },
  { id: 'hadoop', name: 'Apache Hadoop', category: 'Technical' },
  { id: 'kafka', name: 'Apache Kafka', category: 'Technical' },
  { id: 'tableau', name: 'Tableau', category: 'Technical' },
  { id: 'powerbi', name: 'Power BI', category: 'Technical' },
  { id: 'looker', name: 'Looker', category: 'Technical' },

  // Soft Skills
  { id: 'leadership', name: 'Leadership', category: 'Soft' },
  { id: 'communication', name: 'Communication', category: 'Soft' },
  { id: 'teamwork', name: 'Teamwork', category: 'Soft' },
  { id: 'problem-solving', name: 'Problem Solving', category: 'Soft' },
  { id: 'critical-thinking', name: 'Critical Thinking', category: 'Soft' },
  { id: 'project-management', name: 'Project Management', category: 'Professional' },
  { id: 'agile', name: 'Agile Methodology', category: 'Professional' },
  { id: 'scrum', name: 'Scrum', category: 'Professional' },
  { id: 'kanban', name: 'Kanban', category: 'Professional' },
  { id: 'mentoring', name: 'Mentoring', category: 'Soft' },
  { id: 'public-speaking', name: 'Public Speaking', category: 'Soft' },
  { id: 'negotiation', name: 'Negotiation', category: 'Soft' },
  { id: 'time-management', name: 'Time Management', category: 'Soft' },
  { id: 'adaptability', name: 'Adaptability', category: 'Soft' },
  { id: 'creativity', name: 'Creativity', category: 'Soft' },

  // Business Skills
  { id: 'product-management', name: 'Product Management', category: 'Professional' },
  { id: 'market-research', name: 'Market Research', category: 'Professional' },
  { id: 'user-research', name: 'User Research', category: 'Professional' },
  { id: 'competitive-analysis', name: 'Competitive Analysis', category: 'Professional' },
  { id: 'business-strategy', name: 'Business Strategy', category: 'Professional' },
  { id: 'financial-analysis', name: 'Financial Analysis', category: 'Professional' },
  { id: 'stakeholder-management', name: 'Stakeholder Management', category: 'Professional' },
  { id: 'vendor-management', name: 'Vendor Management', category: 'Professional' },
  { id: 'risk-management', name: 'Risk Management', category: 'Professional' },
  { id: 'compliance', name: 'Compliance', category: 'Professional' },
  { id: 'quality-assurance', name: 'Quality Assurance', category: 'Professional' },
  { id: 'process-improvement', name: 'Process Improvement', category: 'Professional' },

  // Marketing Skills
  { id: 'digital-marketing', name: 'Digital Marketing', category: 'Professional' },
  { id: 'content-marketing', name: 'Content Marketing', category: 'Professional' },
  { id: 'seo', name: 'SEO', category: 'Professional' },
  { id: 'sem', name: 'SEM', category: 'Professional' },
  { id: 'social-media-marketing', name: 'Social Media Marketing', category: 'Professional' },
  { id: 'email-marketing', name: 'Email Marketing', category: 'Professional' },
  { id: 'brand-management', name: 'Brand Management', category: 'Professional' },
  { id: 'marketing-analytics', name: 'Marketing Analytics', category: 'Professional' },
  { id: 'conversion-optimization', name: 'Conversion Optimization', category: 'Professional' },
  { id: 'growth-hacking', name: 'Growth Hacking', category: 'Professional' },

  // Sales Skills
  { id: 'sales-strategy', name: 'Sales Strategy', category: 'Professional' },
  { id: 'lead-generation', name: 'Lead Generation', category: 'Professional' },
  { id: 'customer-relationship-management', name: 'Customer Relationship Management', category: 'Professional' },
  { id: 'business-development', name: 'Business Development', category: 'Professional' },
  { id: 'account-management', name: 'Account Management', category: 'Professional' },
  { id: 'sales-forecasting', name: 'Sales Forecasting', category: 'Professional' },
  { id: 'customer-success', name: 'Customer Success', category: 'Professional' },
  { id: 'partnership-development', name: 'Partnership Development', category: 'Professional' }
];

// Complete Work Type to Skills Mapping (ALL 337 work types mapped to skills)
const workTypeToSkills = {
  // DEVELOPMENT - Frontend Development
  'ui-implementation': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html5', 'css3'],
  'state-management': ['react', 'vue', 'angular', 'javascript', 'typescript'],
  'frontend-performance': ['javascript', 'typescript', 'webpack', 'vite'],
  'user-experience-logic': ['javascript', 'typescript', 'react', 'vue'],
  'animations-transitions': ['css3', 'javascript', 'framer', 'after-effects'],
  'responsive-design': ['css3', 'html5', 'sass', 'javascript'],
  'cross-browser-compatibility': ['javascript', 'css3', 'html5'],
  'frontend-accessibility': ['html5', 'css3', 'javascript'],

  // DEVELOPMENT - Backend Development
  'api-development': ['nodejs', 'python', 'java', 'go', 'express', 'fastapi'],
  'database-work': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis'],
  'business-logic': ['nodejs', 'python', 'java', 'go', 'javascript'],
  'integrations': ['nodejs', 'python', 'java'],
  'authentication-authorization': ['nodejs', 'python', 'java'],
  'caching-strategies': ['redis', 'nodejs', 'python', 'java'],
  'background-jobs': ['nodejs', 'python', 'java', 'redis'],
  'microservices': ['docker', 'kubernetes', 'nodejs', 'java', 'go'],

  // DEVELOPMENT - Architecture
  'system-design': ['problem-solving', 'critical-thinking', 'leadership'],
  'technical-debt': ['problem-solving', 'critical-thinking', 'process-improvement'],
  'security-implementation': ['problem-solving', 'risk-management', 'compliance'],
  'performance-optimization': ['problem-solving', 'critical-thinking'],
  'scalability-planning': ['problem-solving', 'critical-thinking', 'leadership'],
  'architecture-patterns': ['problem-solving', 'critical-thinking'],
  'api-gateway-design': ['problem-solving', 'critical-thinking'],
  'data-architecture': ['sql', 'problem-solving', 'critical-thinking'],

  // DEVELOPMENT - DevOps
  'ci-cd-pipeline': ['jenkins', 'github-actions', 'gitlab-ci', 'docker'],
  'environment-setup': ['docker', 'kubernetes', 'terraform'],
  'monitoring-logging': ['problem-solving', 'critical-thinking'],
  'deployment': ['docker', 'kubernetes', 'aws', 'azure'],
  'containerization': ['docker', 'kubernetes'],
  'infrastructure-as-code': ['terraform', 'ansible', 'aws'],
  'cloud-configuration': ['aws', 'azure', 'gcp'],
  'security-automation': ['risk-management', 'compliance'],

  // DEVELOPMENT - Mobile Development
  'native-ios': ['swift', 'ios-dev'],
  'native-android': ['kotlin', 'java', 'android-dev'],
  'cross-platform': ['react-native', 'flutter', 'ionic'],
  'mobile-ui': ['swift', 'kotlin', 'react-native', 'flutter'],
  'mobile-performance': ['problem-solving', 'critical-thinking'],
  'mobile-offline-support': ['problem-solving', 'critical-thinking'],
  'mobile-security': ['risk-management', 'compliance'],
  'app-store-deployment': ['project-management'],

  // DEVELOPMENT - Testing
  'unit-testing': ['javascript', 'python', 'java', 'quality-assurance'],
  'integration-testing': ['javascript', 'python', 'java', 'quality-assurance'],
  'e2e-testing': ['javascript', 'python', 'quality-assurance'],
  'performance-testing': ['quality-assurance', 'problem-solving'],
  'security-testing': ['quality-assurance', 'risk-management'],
  'test-automation': ['javascript', 'python', 'quality-assurance'],
  'snapshot-testing': ['javascript', 'quality-assurance'],
  'accessibility-testing': ['quality-assurance', 'html5'],

  // DEVELOPMENT - Documentation
  'api-documentation': ['communication', 'teamwork'],
  'code-comments': ['communication', 'teamwork'],
  'developer-guides': ['communication', 'teamwork'],
  'architecture-documentation': ['communication', 'teamwork'],
  'onboarding-documentation': ['communication', 'teamwork'],
  'system-diagrams': ['communication', 'teamwork'],
  'code-standards': ['communication', 'teamwork'],
  'release-notes': ['communication', 'teamwork'],

  // DEVELOPMENT - Data Engineering
  'etl-pipelines': ['python', 'sql', 'spark', 'hadoop'],
  'data-warehousing': ['sql', 'postgresql', 'mysql'],
  'data-modeling': ['sql', 'problem-solving'],
  'data-migration': ['sql', 'python', 'problem-solving'],
  'big-data-processing': ['spark', 'hadoop', 'python'],
  'data-quality': ['sql', 'python', 'quality-assurance'],
  'analytics-implementation': ['sql', 'python', 'tableau', 'powerbi'],
  'realtime-data-pipelines': ['kafka', 'spark', 'python'],

  // DESIGN - User Research
  'user-interviews': ['user-research', 'communication'],
  'usability-testing': ['user-research', 'quality-assurance'],
  'heuristic-evaluation': ['user-research', 'critical-thinking'],
  'competitive-ux-analysis': ['competitive-analysis', 'user-research'],
  'user-surveys': ['user-research', 'communication'],
  'field-studies': ['user-research', 'communication'],
  'diary-studies': ['user-research', 'communication'],
  'analytics-review': ['user-research', 'critical-thinking'],

  // DESIGN - UX Planning
  'user-flows': ['figma', 'sketch', 'user-research'],
  'information-architecture': ['figma', 'sketch', 'user-research'],
  'journey-mapping': ['figma', 'user-research'],
  'ux-strategy': ['user-research', 'critical-thinking'],
  'content-strategy': ['content-marketing', 'user-research'],
  'user-personas': ['user-research', 'communication'],
  'use-cases': ['user-research', 'problem-solving'],
  'storyboarding': ['figma', 'sketch', 'creativity'],

  // DESIGN - Interaction Design
  'wireframing': ['figma', 'sketch', 'adobe-xd'],
  'prototyping': ['figma', 'sketch', 'principle', 'framer'],
  'interaction-design': ['figma', 'sketch', 'adobe-xd'],
  'accessibility-design': ['figma', 'html5', 'css3'],
  'gesture-design': ['figma', 'sketch', 'creativity'],
  'animation-design': ['after-effects', 'principle', 'framer'],
  'responsive-design-planning': ['figma', 'css3', 'html5'],
  'form-design': ['figma', 'sketch', 'user-research'],

  // DESIGN - Visual Design
  'ui-mockups': ['figma', 'sketch', 'photoshop'],
  'style-guide-creation': ['figma', 'sketch', 'illustrator'],
  'iconography': ['illustrator', 'figma', 'sketch'],
  'illustration': ['illustrator', 'photoshop', 'creativity'],
  'typography': ['figma', 'sketch', 'photoshop'],
  'color-systems': ['figma', 'sketch', 'creativity'],
  'branding-elements': ['illustrator', 'photoshop', 'figma'],
  'data-visualization': ['figma', 'sketch', 'tableau'],

  // DESIGN - Design Systems
  'component-design': ['figma', 'sketch', 'user-research'],
  'pattern-library': ['figma', 'sketch', 'teamwork'],
  'design-tokens': ['figma', 'teamwork'],
  'system-documentation': ['figma', 'communication', 'teamwork'],
  'design-system-governance': ['figma', 'leadership', 'teamwork'],
  'component-variants': ['figma', 'sketch', 'problem-solving'],
  'system-adoption': ['figma', 'communication', 'leadership'],
  'system-versioning': ['figma', 'project-management'],

  // DESIGN - Design Collaboration
  'design-reviews': ['figma', 'communication', 'teamwork'],
  'handoff-to-ui-design': ['figma', 'sketch', 'communication'],
  'developer-collaboration': ['figma', 'communication', 'teamwork'],
  'stakeholder-presentations': ['figma', 'communication', 'public-speaking'],
  'design-workshops': ['figma', 'leadership'],
  'cross-functional-alignment': ['communication', 'leadership', 'teamwork'],
  'design-documentation': ['figma', 'communication'],
  'design-advocacy': ['communication', 'leadership', 'public-speaking'],

  // DESIGN - Specialized Design
  'mobile-design': ['figma', 'sketch', 'user-research'],
  'responsive-web-design': ['figma', 'css3', 'html5'],
  'design-for-print': ['photoshop', 'illustrator', 'indesign'],
  'email-design': ['figma', 'photoshop', 'html5'],
  'landing-page-design': ['figma', 'sketch', 'conversion-optimization'],
  'dashboard-design': ['figma', 'sketch'],
  'video-motion-graphics': ['after-effects', 'creativity'],
  'conversational-design': ['figma', 'user-research', 'communication'],

  // DESIGN - Design Testing & Validation
  'a-b-testing': ['figma', 'user-research', 'marketing-analytics'],
  'usability-studies': ['user-research', 'figma', 'quality-assurance'],
  'design-validation': ['figma', 'user-research', 'sketch'],
  'concept-testing': ['user-research', 'figma', 'critical-thinking'],
  'preference-testing': ['user-research', 'figma'],
  'benchmark-testing': ['user-research', 'competitive-analysis'],
  'first-click-testing': ['user-research', 'figma'],
  'eye-tracking': ['user-research', 'critical-thinking'],

  // PRODUCT MANAGEMENT - Product Strategy
  'market-research': ['market-research', 'competitive-analysis', 'critical-thinking'],
  'roadmap-planning': ['product-management', 'leadership', 'communication'],
  'okr-goal-setting': ['product-management', 'leadership'],
  'business-case-development': ['business-strategy', 'financial-analysis'],
  'competitive-analysis': ['competitive-analysis', 'market-research'],
  'pricing-strategy': ['product-management', 'financial-analysis'],
  'vision-definition': ['product-management', 'leadership', 'communication'],
  'go-to-market-strategy': ['product-management', 'marketing-analytics'],

  // PRODUCT MANAGEMENT - Product Discovery
  'customer-interviews': ['user-research', 'communication'],
  'problem-validation': ['user-research', 'product-management'],
  'solution-exploration': ['product-management', 'problem-solving'],
  'opportunity-assessment': ['market-research', 'business-strategy'],
  'design-sprints': ['creativity', 'teamwork', 'leadership'],
  'concept-validation': ['user-research', 'product-management'],
  'prototype-testing': ['user-research', 'quality-assurance'],
  'user-feedback-analysis': ['user-research', 'critical-thinking'],

  // PRODUCT MANAGEMENT - Requirements
  'user-story-creation': ['product-management', 'communication'],
  'feature-specification': ['product-management', 'communication'],
  'backlog-grooming': ['product-management', 'agile'],
  'customer-research-review': ['user-research', 'critical-thinking'],
  'acceptance-criteria': ['product-management', 'quality-assurance'],
  'story-mapping': ['product-management', 'agile'],
  'prioritization': ['product-management', 'critical-thinking'],
  'technical-requirement-definition': ['product-management', 'communication'],

  // PRODUCT MANAGEMENT - Product Execution
  'sprint-planning': ['product-management', 'agile', 'scrum'],
  'stakeholder-communication': ['communication', 'stakeholder-management'],
  'cross-functional-coordination': ['leadership', 'teamwork', 'communication'],
  'release-management': ['product-management', 'project-management'],
  'issue-triage': ['product-management', 'problem-solving'],
  'decision-making': ['leadership', 'critical-thinking'],
  'development-support': ['communication', 'teamwork'],
  'qa-coordination': ['quality-assurance', 'communication'],

  // PRODUCT MANAGEMENT - Product Analysis
  'feature-performance-analysis': ['product-management', 'critical-thinking'],
  'customer-feedback-analysis': ['user-research', 'critical-thinking'],
  'competitive-analysis-detailed': ['competitive-analysis', 'market-research'],
  'ab-test-review': ['product-management', 'critical-thinking'],
  'metrics-definition': ['product-management', 'critical-thinking'],
  'funnel-analysis': ['product-management', 'critical-thinking'],
  'retention-analysis': ['product-management', 'critical-thinking'],
  'revenue-analysis': ['financial-analysis', 'critical-thinking'],

  // PRODUCT MANAGEMENT - Product Documentation
  'product-requirements-document': ['product-management', 'communication'],
  'user-guides': ['communication', 'teamwork'],
  'product-presentations': ['communication', 'public-speaking'],
  'feature-announcements': ['communication', 'marketing-analytics'],
  'knowledge-base-articles': ['communication', 'teamwork'],
  'sales-enablement-materials': ['communication', 'sales-strategy'],
  'product-videos': ['communication', 'creativity'],
  'internal-documentation': ['communication', 'teamwork'],

  // PRODUCT MANAGEMENT - Customer Success
  'customer-onboarding': ['customer-success', 'communication'],
  'training-materials': ['communication', 'customer-success'],
  'customer-support': ['customer-success', 'communication'],
  'account-management': ['account-management', 'customer-relationship-management'],
  'customer-advocacy': ['customer-success', 'communication'],
  'customer-feedback-collection': ['user-research', 'communication'],
  'success-metrics-tracking': ['customer-success', 'critical-thinking'],
  'churn-prevention': ['customer-success', 'problem-solving'],

  // PRODUCT MANAGEMENT - Product Growth
  'growth-experiments': ['growth-hacking', 'critical-thinking'],
  'user-acquisition': ['growth-hacking', 'marketing-analytics'],
  'engagement-strategies': ['growth-hacking', 'user-research'],
  'virality-features': ['growth-hacking', 'creativity'],
  'monetization-optimization': ['growth-hacking', 'financial-analysis'],
  'referral-programs': ['growth-hacking', 'marketing-analytics'],
  'channel-optimization': ['growth-hacking', 'marketing-analytics'],
  'conversion-rate-optimization': ['conversion-optimization', 'marketing-analytics'],

  // MARKETING - Marketing Strategy
  'campaign-planning': ['digital-marketing', 'communication'],
  'market-research-mktg': ['market-research', 'competitive-analysis'],
  'brand-development': ['brand-management', 'creativity'],
  'product-marketing': ['product-management', 'marketing-analytics'],
  'audience-segmentation': ['marketing-analytics', 'user-research'],
  'competitive-positioning': ['competitive-analysis', 'brand-management'],
  'marketing-budget-planning': ['financial-analysis', 'marketing-analytics'],
  'marketing-analytics-strategy': ['marketing-analytics', 'critical-thinking'],

  // MARKETING - Content Marketing
  'content-creation': ['content-marketing', 'creativity', 'communication'],
  'blog-management': ['content-marketing', 'communication'],
  'case-studies': ['content-marketing', 'communication'],
  'whitepapers-ebooks': ['content-marketing', 'communication'],
  'content-strategy': ['content-marketing', 'communication'],
  'editorial-calendar': ['content-marketing', 'project-management'],
  'content-distribution': ['content-marketing', 'digital-marketing'],
  'content-performance-analysis': ['content-marketing', 'marketing-analytics'],

  // MARKETING - Digital Marketing
  'website-management': ['digital-marketing', 'html5', 'css3'],
  'email-marketing': ['email-marketing', 'digital-marketing'],
  'social-media': ['social-media-marketing', 'communication'],
  'seo-sem': ['seo', 'sem', 'digital-marketing'],
  'ppc-campaign-management': ['sem', 'marketing-analytics'],
  'marketing-automation': ['digital-marketing', 'marketing-analytics'],
  'landing-page-optimization': ['conversion-optimization', 'digital-marketing'],
  'digital-analytics': ['marketing-analytics', 'critical-thinking'],

  // MARKETING - Event Marketing
  'webinar-management': ['communication', 'public-speaking'],
  'conference-planning': ['project-management', 'communication'],
  'customer-events': ['communication', 'customer-success'],
  'partner-marketing': ['partnership-development', 'communication'],
  'trade-show-management': ['project-management', 'communication'],
  'virtual-events': ['communication', 'digital-marketing'],
  'event-logistics': ['project-management', 'communication'],
  'event-roi-analysis': ['marketing-analytics', 'financial-analysis'],

  // MARKETING - Product Marketing
  'product-positioning': ['product-management', 'brand-management'],
  'product-messaging': ['communication', 'brand-management'],
  'go-to-market-planning': ['product-management', 'marketing-analytics'],
  'product-launches': ['product-management', 'project-management'],
  'sales-enablement': ['sales-strategy', 'communication'],
  'competitive-intelligence': ['competitive-analysis', 'market-research'],
  'product-adoption': ['product-management', 'customer-success'],
  'customer-marketing': ['customer-success', 'marketing-analytics'],

  // MARKETING - Brand Management
  'brand-strategy': ['brand-management', 'business-strategy'],
  'brand-guidelines': ['brand-management', 'communication'],
  'brand-assets': ['brand-management', 'creativity'],
  'brand-voice': ['brand-management', 'communication'],
  'rebranding-initiatives': ['brand-management', 'project-management'],
  'brand-monitoring': ['brand-management', 'marketing-analytics'],
  'brand-awareness': ['brand-management', 'marketing-analytics'],
  'brand-partnerships': ['brand-management', 'partnership-development'],

  // MARKETING - Creative Services
  'design-production': ['photoshop', 'illustrator', 'creativity'],
  'video-production': ['after-effects', 'creativity'],
  'copywriting': ['communication', 'creativity'],
  'creative-direction': ['creativity', 'leadership'],
  'creative-campaign-development': ['creativity', 'marketing-analytics'],
  'asset-creation': ['photoshop', 'illustrator', 'creativity'],
  'photography-direction': ['creativity', 'communication'],
  'design-system-marketing': ['figma', 'brand-management'],

  // MARKETING - Growth Marketing
  'acquisition-strategy': ['growth-hacking', 'marketing-analytics'],
  'conversion-optimization': ['conversion-optimization', 'marketing-analytics'],
  'a-b-testing-program': ['marketing-analytics', 'critical-thinking'],
  'funnel-optimization': ['marketing-analytics', 'conversion-optimization'],
  'referral-marketing': ['growth-hacking', 'marketing-analytics'],
  'growth-experimentation': ['growth-hacking', 'critical-thinking'],
  'retention-marketing': ['customer-success', 'marketing-analytics'],
  'marketing-analytics-growth': ['marketing-analytics', 'growth-hacking'],

  // SALES - Sales Prospecting
  'lead-generation': ['lead-generation', 'sales-strategy'],
  'account-research': ['sales-strategy', 'market-research'],
  'outreach-campaigns': ['communication', 'sales-strategy'],
  'networking': ['communication'],
  'prospect-qualification': ['sales-strategy', 'critical-thinking'],
  'cold-calling': ['communication', 'sales-strategy'],
  'social-selling': ['social-media-marketing', 'sales-strategy'],
  'lead-nurturing': ['lead-generation', 'customer-relationship-management'],

  // SALES - Opportunity Management
  'discovery-calls': ['communication', 'sales-strategy'],
  'solution-design': ['sales-strategy', 'problem-solving'],
  'proposal-development': ['communication', 'sales-strategy'],
  'negotiations': ['negotiation', 'sales-strategy'],
  'demo-presentations': ['communication', 'public-speaking'],
  'objection-handling': ['communication', 'sales-strategy'],
  'value-proposition': ['communication', 'sales-strategy'],
  'closing-techniques': ['sales-strategy', 'negotiation'],

  // SALES - Account Management
  'customer-meetings': ['communication', 'account-management'],
  'relationship-building': ['customer-relationship-management', 'communication'],
  'upsell-cross-sell': ['account-management', 'sales-strategy'],
  'renewal-management': ['account-management', 'customer-success'],
  'account-planning': ['account-management', 'sales-strategy'],
  'executive-relationship': ['account-management', 'leadership'],
  'customer-success-coordination': ['customer-success', 'communication'],
  'account-health-monitoring': ['account-management', 'customer-success'],

  // SALES - Sales Operations
  'forecasting': ['sales-forecasting', 'financial-analysis'],
  'crm-management': ['customer-relationship-management', 'sales-strategy'],
  'competitive-analysis-sales': ['competitive-analysis', 'sales-strategy'],
  'sales-enablement-toolkit': ['sales-strategy', 'communication'],
  'sales-process-optimization': ['sales-strategy', 'process-improvement'],
  'territory-management': ['sales-strategy', 'project-management'],
  'sales-analytics': ['sales-forecasting', 'critical-thinking'],
  'sales-tool-implementation': ['sales-strategy', 'project-management'],

  // OPERATIONS - Infrastructure
  'cloud-architecture': ['aws', 'azure', 'gcp', 'kubernetes'],
  'server-management': ['aws', 'azure', 'docker'],
  'network-configuration': ['aws', 'azure'],
  'database-operations': ['postgresql', 'mysql', 'mongodb'],
  'storage-management': ['aws', 'azure', 'gcp'],
  'compute-optimization': ['aws', 'azure', 'kubernetes'],
  'virtualization': ['docker', 'kubernetes', 'aws'],
  'clustering-high-availability': ['kubernetes', 'aws', 'azure'],

  // OPERATIONS - DevOps Pipelines
  'ci-pipeline-development': ['jenkins', 'github-actions', 'gitlab-ci'],
  'cd-pipeline-development': ['jenkins', 'github-actions', 'gitlab-ci'],
  'pipeline-monitoring': ['jenkins', 'problem-solving'],
  'pipeline-optimization': ['jenkins', 'github-actions', 'problem-solving'],
  'build-automation': ['jenkins', 'github-actions', 'docker'],
  'artifact-management': ['jenkins', 'docker'],
  'environment-provisioning': ['terraform', 'ansible', 'docker'],
  'release-orchestration': ['jenkins', 'kubernetes', 'project-management'],

  // FINANCE - Accounting
  'financial-reporting': ['financial-analysis', 'communication'],
  'accounts-payable': ['financial-analysis', 'process-improvement'],
  'accounts-receivable': ['financial-analysis', 'process-improvement'],
  'general-ledger': ['financial-analysis', 'compliance'],
  'month-end-close': ['financial-analysis', 'process-improvement'],
  'fixed-assets': ['financial-analysis', 'compliance'],
  'accounting-systems': ['financial-analysis', 'process-improvement'],
  'financial-controls': ['financial-analysis', 'compliance', 'risk-management'],

  // HR - Talent Acquisition
  'recruitment': ['communication', 'stakeholder-management'],
  'employer-branding': ['brand-management', 'communication'],
  'onboarding-hr': ['communication', 'process-improvement'],
  'workforce-planning': ['project-management', 'critical-thinking'],
  'recruiting-strategy': ['communication', 'stakeholder-management'],
  'candidate-experience': ['communication', 'customer-success'],
  'interview-process': ['communication', 'process-improvement'],
  'sourcing-strategy': ['communication'],

  // LEGAL - Contract Management
  'contract-drafting': ['communication', 'critical-thinking'],
  'contract-negotiation': ['negotiation', 'communication'],
  'contract-review': ['critical-thinking', 'risk-management'],
  'template-development': ['communication', 'process-improvement'],
  'contract-lifecycle': ['process-improvement', 'project-management'],
  'vendor-contracts': ['vendor-management', 'negotiation'],
  'customer-contracts': ['customer-relationship-management', 'negotiation'],
  'employment-contracts': ['communication', 'compliance']
};

async function seedReferenceData() {
  console.log('🌱 Starting reference data seeding...');

  try {
    // 1. Seed Focus Areas
    console.log('📝 Seeding Focus Areas...');
    for (const focusArea of primaryFocusAreas) {
      await prisma.focusArea.upsert({
        where: { id: focusArea.id },
        update: {},
        create: focusArea
      });
    }

    // 2. Seed Skills first (needed for WorkTypeSkill mappings)
    console.log('🔧 Seeding Skills...');
    for (const skill of skills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: {},
        create: skill
      });
    }

    // 3. Seed Work Categories and Work Types
    console.log('📂 Seeding Work Categories and Work Types...');
    for (const [focusAreaId, categories] of Object.entries(workCategories)) {
      for (const category of categories) {
        // Create the work category
        const categoryId = `${focusAreaId}-${category.id}`;
        await prisma.workCategory.upsert({
          where: { id: categoryId },
          update: {},
          create: {
            id: categoryId,
            label: category.label,
            focusAreaId
          }
        });

        // Create work types for this category
        for (const workType of category.workTypes) {
          const workTypeId = `${focusAreaId}-${workType.id}`;
          await prisma.workType.upsert({
            where: { id: workTypeId },
            update: {},
            create: {
              id: workTypeId,
              label: workType.label,
              workCategoryId: categoryId
            }
          });
        }
      }
    }

    // 4. Seed Work Type to Skills mappings
    console.log('🔗 Seeding Work Type to Skills mappings...');
    for (const [workTypeKey, skillIds] of Object.entries(workTypeToSkills)) {
      // Find matching work types for this key
      const matchingWorkTypes = [];
      for (const [focusAreaId, categories] of Object.entries(workCategories)) {
        for (const category of categories) {
          for (const workType of category.workTypes) {
            if (workType.id === workTypeKey) {
              matchingWorkTypes.push(`${focusAreaId}-${workType.id}`);
            }
          }
        }
      }

      // Create mappings for each matching work type
      for (const workTypeId of matchingWorkTypes) {
        for (const skillId of skillIds) {
          try {
            await prisma.workTypeSkill.upsert({
              where: {
                workTypeId_skillId: {
                  workTypeId,
                  skillId
                }
              },
              update: {},
              create: {
                workTypeId,
                skillId
              }
            });
          } catch (error) {
            // Skip if skill doesn't exist - this handles cases where mapped skills aren't in our skills array
            console.log(`⚠️ Skipping mapping for skill ${skillId} (not found)`);
          }
        }
      }
    }

    console.log('✅ Reference data seeding completed!');

    const focusAreaCount = await prisma.focusArea.count();
    const workCategoryCount = await prisma.workCategory.count();
    const workTypeCount = await prisma.workType.count();
    const skillCount = await prisma.skill.count();
    const workTypeSkillCount = await prisma.workTypeSkill.count();

    console.log(`📊 Seeded ${focusAreaCount} focus areas`);
    console.log(`📊 Seeded ${workCategoryCount} work categories`);
    console.log(`📊 Seeded ${workTypeCount} work types`);
    console.log(`📊 Seeded ${skillCount} skills`);
    console.log(`📊 Seeded ${workTypeSkillCount} work type-skill mappings`);

  } catch (error) {
    console.error('❌ Error seeding reference data:', error);
    throw error;
  }
}

async function seedSkillBenchmarks() {
  console.log('📈 Starting skill benchmarks seeding...');

  try {
    // Read skill benchmarks from JSON file
    const benchmarksPath = path.join(__dirname, '../skill-benchmarks-export.json');

    if (!fs.existsSync(benchmarksPath)) {
      console.log('⚠️ Skill benchmarks file not found, skipping benchmark seeding');
      return;
    }

    const benchmarksData = JSON.parse(fs.readFileSync(benchmarksPath, 'utf8'));

    console.log(`📊 Seeding ${benchmarksData.length} skill benchmarks...`);

    for (const benchmark of benchmarksData) {
      await prisma.skillBenchmark.upsert({
        where: { id: benchmark.id },
        update: {},
        create: {
          id: benchmark.id,
          skillName: benchmark.skillName,
          industry: benchmark.industry || 'general',
          role: benchmark.role || 'general',
          industryAverage: benchmark.industryAverage,
          juniorLevel: benchmark.juniorLevel,
          midLevel: benchmark.midLevel,
          seniorLevel: benchmark.seniorLevel,
          expertLevel: benchmark.expertLevel,
          marketDemand: benchmark.marketDemand,
          growthTrend: benchmark.growthTrend,
          description: benchmark.description || ''
        }
      });
    }

    const benchmarkCount = await prisma.skillBenchmark.count();
    console.log(`✅ Seeded ${benchmarkCount} skill benchmarks`);

  } catch (error) {
    console.error('❌ Error seeding skill benchmarks:', error);
    // Don't throw - benchmark seeding is optional
  }
}

async function seedTestData() {
  console.log('👤 Starting test data seeding...');

  try {
    // Create test organization
    const techCorp = await prisma.organization.upsert({
      where: { domain: 'techcorp.com' },
      update: {
        name: 'Inchronicle',
        description: 'Career intelligence platform — turn daily work into career stories',
      },
      create: {
        name: 'Inchronicle',
        domain: 'techcorp.com',
        description: 'Career intelligence platform — turn daily work into career stories',
      }
    });

    // Create test workspace
    const frontendWorkspace = await prisma.workspace.upsert({
      where: { id: 'frontend-workspace' },
      update: {
        name: 'Product & Engineering',
        description: 'Building the Inchronicle platform',
      },
      create: {
        id: 'frontend-workspace',
        name: 'Product & Engineering',
        description: 'Building the Inchronicle platform',
        organizationId: techCorp.id
      }
    });

    // Create test user
    const hashedPassword = await hashPassword('password123');
    const testUserData = {
      name: 'Ketan Khairnar',
      title: 'CTO',
      bio: 'Building Inchronicle — the career intelligence platform that turns your daily work into powerful career stories. 15+ years shipping products across startups and scale-ups. Obsessed with developer tools, AI-assisted workflows, and making invisible work visible.',
      location: 'San Francisco, CA',
      company: 'Inchronicle',
      industry: 'Technology',
      yearsOfExperience: 15,
      avatar: 'https://avatars.githubusercontent.com/u/83536?v=4',
    };
    const testUser = await prisma.user.upsert({
      where: { email: 'test@techcorp.com' },
      update: testUserData,
      create: {
        ...testUserData,
        email: 'test@techcorp.com',
        password: hashedPassword,
        profile: {
          create: {
            profileCompleteness: 100,
            showEmail: false,
            showLocation: true,
            showCompany: true,
          }
        }
      }
    });

    // Create workspace membership
    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: testUser.id,
          workspaceId: frontendWorkspace.id
        }
      },
      update: {},
      create: {
        userId: testUser.id,
        workspaceId: frontendWorkspace.id,
        role: 'admin'
      }
    });

    console.log('✅ Test data seeding completed!');
    console.log('🔑 Test Login Credentials:');
    console.log('Email: test@techcorp.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive database seeding...');

  try {
    // Seed in dependency order
    await seedReferenceData();
    await seedSkillBenchmarks();
    await seedTestData();

    console.log('🎉 All seeding completed successfully!');
    console.log('');
    console.log('🎯 Ready for development:');
    console.log('- Reference data populated for journal entry creation');
    console.log('- Skill benchmarks available for user progress tracking');
    console.log('- Test user available for development');
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });