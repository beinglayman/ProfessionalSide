import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reference data provided by user
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

// Work type to skills mapping based on the new work type IDs
const workTypeToSkills = {
  // Frontend Development work types
  'ui-implementation': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html5', 'css3'],
  'state-management': ['react', 'vue', 'angular', 'javascript', 'typescript'],
  'frontend-performance': ['javascript', 'typescript', 'webpack', 'vite'],
  'user-experience-logic': ['javascript', 'typescript', 'react', 'vue'],
  'animations-transitions': ['css3', 'javascript', 'framer', 'after-effects'],
  'responsive-design': ['css3', 'html5', 'sass', 'javascript'],
  'cross-browser-compatibility': ['javascript', 'css3', 'html5'],
  'frontend-accessibility': ['html5', 'css3', 'javascript'],
  
  // Backend Development work types
  'api-development': ['nodejs', 'python', 'java', 'go', 'express', 'fastapi'],
  'database-work': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis'],
  'business-logic': ['nodejs', 'python', 'java', 'go', 'javascript'],
  'integrations': ['nodejs', 'python', 'java'],
  'authentication-authorization': ['nodejs', 'python', 'java'],
  'caching-strategies': ['redis', 'nodejs', 'python', 'java'],
  'background-jobs': ['nodejs', 'python', 'java', 'redis'],
  'microservices': ['docker', 'kubernetes', 'nodejs', 'java', 'go'],
  
  // Architecture work types
  'system-design': ['architecture'],
  'technical-debt': ['refactoring'],
  'security-implementation': ['security'],
  'performance-optimization': ['performance'],
  'scalability-planning': ['architecture', 'scalability'],
  'architecture-patterns': ['architecture'],
  'api-gateway-design': ['microservices', 'architecture'],
  'data-architecture': ['sql', 'architecture'],
  
  // DevOps work types
  'ci-cd-pipeline': ['jenkins', 'github-actions', 'gitlab-ci', 'docker'],
  'environment-setup': ['docker', 'kubernetes', 'terraform'],
  'monitoring-logging': ['monitoring'],
  'deployment': ['docker', 'kubernetes', 'aws', 'azure'],
  'containerization': ['docker', 'kubernetes'],
  'infrastructure-as-code': ['terraform', 'ansible', 'aws'],
  'cloud-configuration': ['aws', 'azure', 'gcp'],
  'security-automation': ['security'],
  
  // Mobile Development work types
  'native-ios': ['swift', 'ios-dev'],
  'native-android': ['kotlin', 'java', 'android-dev'],
  'cross-platform': ['react-native', 'flutter', 'ionic'],
  'mobile-ui': ['swift', 'kotlin', 'react-native', 'flutter'],
  'mobile-performance': ['optimization'],
  'mobile-offline-support': ['caching'],
  'mobile-security': ['security'],
  'app-store-deployment': ['deployment'],
  
  // User Research work types
  'user-interviews': ['user-research'],
  'usability-testing': ['user-research'],
  'heuristic-evaluation': ['user-research'],
  'competitive-ux-analysis': ['competitive-analysis', 'user-research'],
  'user-surveys': ['user-research'],
  'field-studies': ['user-research'],
  'diary-studies': ['user-research'],
  'analytics-review': ['analytics'],
  
  // UX Planning work types
  'user-flows': ['figma', 'sketch'],
  'information-architecture': ['figma', 'sketch', 'user-research'],
  'journey-mapping': ['figma', 'user-research'],
  'ux-strategy': ['user-research'],
  'content-strategy': ['content-marketing'],
  'user-personas': ['user-research'],
  'use-cases': ['user-research'],
  'storyboarding': ['figma', 'sketch'],
  
  // Interaction Design work types
  'wireframing': ['figma', 'sketch', 'adobe-xd'],
  'prototyping': ['figma', 'sketch', 'principle', 'framer'],
  'interaction-design': ['figma', 'sketch', 'adobe-xd'],
  'accessibility-design': ['figma', 'html5', 'css3'],
  'gesture-design': ['figma', 'sketch'],
  'animation-design': ['after-effects', 'principle', 'framer'],
  'responsive-design-planning': ['figma', 'css3'],
  'form-design': ['figma', 'sketch'],
  
  // Visual Design work types
  'ui-mockups': ['figma', 'sketch', 'photoshop'],
  'style-guide-creation': ['figma', 'sketch', 'photoshop'],
  'iconography': ['illustrator', 'figma', 'sketch'],
  'illustration': ['illustrator', 'photoshop'],
  'typography': ['figma', 'sketch', 'photoshop'],
  'color-systems': ['figma', 'sketch'],
  'branding-elements': ['illustrator', 'photoshop', 'figma'],
  'data-visualization': ['figma', 'sketch'],
  
  // Product Strategy work types
  'market-research': ['market-research', 'competitive-analysis'],
  'roadmap-planning': ['product-management'],
  'okr-goal-setting': ['product-management'],
  'business-case-development': ['business-strategy', 'financial-analysis'],
  'competitive-analysis': ['competitive-analysis', 'market-research'],
  'pricing-strategy': ['product-management', 'financial-analysis'],
  'vision-definition': ['product-management', 'leadership'],
  'go-to-market-strategy': ['product-management', 'marketing'],
  
  // Customer interviews and feedback
  'customer-interviews': ['user-research'],
  'problem-validation': ['user-research', 'product-management'],
  'solution-exploration': ['product-management'],
  'opportunity-assessment': ['market-research', 'business-strategy'],
  'design-sprints': ['design-thinking'],
  'concept-validation': ['user-research'],
  'prototype-testing': ['prototyping', 'user-research'],
  'user-feedback-analysis': ['user-research', 'analytics'],
  
  // Design Testing work types
  'a-b-testing': ['figma', 'user-research', 'marketing-analytics'],
  'usability-studies': ['user-research', 'figma'],
  'design-validation': ['figma', 'user-research', 'sketch'],
  'concept-testing': ['user-research', 'figma'],
  'preference-testing': ['user-research', 'figma'],
  'benchmark-testing': ['user-research', 'competitive-analysis'],
  'first-click-testing': ['user-research', 'figma'],
  'eye-tracking': ['user-research'],
  
  // Visual Design work types
  'ui-mockups': ['figma', 'sketch', 'photoshop'],
  'style-guide-creation': ['figma', 'sketch', 'illustrator'],
  'iconography': ['illustrator', 'figma', 'sketch'],
  'illustration': ['illustrator', 'photoshop'],
  'typography': ['figma', 'sketch', 'photoshop'],
  'color-systems': ['figma', 'sketch'],
  'branding-elements': ['illustrator', 'photoshop', 'figma'],
  'data-visualization': ['figma', 'sketch'],
  
  // Interaction Design work types
  'wireframing': ['figma', 'sketch', 'adobe-xd'],
  'prototyping': ['figma', 'sketch', 'principle', 'framer'],
  'interaction-design': ['figma', 'sketch', 'adobe-xd'],
  'accessibility-design': ['figma', 'html5', 'css3'],
  'gesture-design': ['figma', 'sketch'],
  'animation-design': ['after-effects', 'principle', 'framer'],
  'responsive-design-planning': ['figma', 'css3'],
  'form-design': ['figma', 'sketch'],
  
  // Design Systems work types
  'component-design': ['figma', 'sketch'],
  'pattern-library': ['figma', 'sketch'],
  'design-tokens': ['figma'],
  'system-documentation': ['figma'],
  'design-system-governance': ['figma', 'leadership'],
  'component-variants': ['figma', 'sketch'],
  'system-adoption': ['figma', 'communication'],
  'system-versioning': ['figma'],
  
  // Design Collaboration work types
  'design-reviews': ['figma', 'communication'],
  'handoff-to-ui-design': ['figma', 'sketch'],
  'developer-collaboration': ['figma', 'communication'],
  'stakeholder-presentations': ['figma', 'communication'],
  'design-workshops': ['figma', 'leadership'],
  'cross-functional-alignment': ['communication', 'leadership'],
  'design-documentation': ['figma'],
  'design-advocacy': ['communication', 'leadership']
};

async function seedReferenceData() {
  console.log('🌱 Starting reference data seeding...');

  try {
    // 1. Seed Focus Areas
    console.log('📝 Seeding Focus Areas...');
    for (const focusArea of primaryFocusAreas) {
      await prisma.focusArea.upsert({
        where: { id: focusArea.id },
        update: { updatedAt: new Date() },
        create: {
          ...focusArea,
          updatedAt: new Date()
        }
      });
    }

    // 2. Seed Work Categories and Work Types
    console.log('📂 Seeding Work Categories and Work Types...');
    for (const [focusAreaId, categories] of Object.entries(workCategories)) {
      for (const category of categories) {
        // Create the work category
        const categoryId = `${focusAreaId}-${category.id}`;
        await prisma.workCategory.upsert({
          where: { id: categoryId },
          update: { updatedAt: new Date() },
          create: {
            id: categoryId,
            label: category.label,
            focusAreaId: focusAreaId,
            updatedAt: new Date()
          }
        });

        // Create work types for this category
        for (const workType of category.workTypes) {
          const workTypeId = `${categoryId}-${workType.id}`;
          await prisma.workType.upsert({
            where: { id: workTypeId },
            update: { updatedAt: new Date() },
            create: {
              id: workTypeId,
              label: workType.label,
              workCategoryId: categoryId,
              updatedAt: new Date()
            }
          });
        }
      }
    }

    // 4. Seed Skills
    console.log('⚡ Seeding Skills...');
    for (const skill of skills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: { updatedAt: new Date() },
        create: {
          ...skill,
          updatedAt: new Date()
        }
      });
    }

    // 4. Seed Work Type Skills mappings
    console.log('🔗 Seeding Work Type Skills mappings...');
    for (const [workTypeShortId, skillIds] of Object.entries(workTypeToSkills)) {
      // Find the work type by searching for work types that end with the short ID
      const workType = await prisma.workType.findFirst({
        where: { 
          id: { 
            endsWith: `-${workTypeShortId}` 
          } 
        }
      });
      
      if (workType) {
        for (const skillId of skillIds) {
          // Check if skill exists
          const skill = await prisma.skill.findUnique({
            where: { id: skillId }
          });
          
          if (skill) {
            await prisma.workTypeSkill.upsert({
              where: {
                workTypeId_skillId: {
                  workTypeId: workType.id,
                  skillId: skill.id
                }
              },
              update: { updatedAt: new Date() },
              create: {
                workTypeId: workType.id,
                skillId: skill.id,
                updatedAt: new Date()
              }
            });
          }
        }
      }
    }

    console.log('✅ Reference data seeding completed successfully!');
    console.log('');
    console.log('📊 Seeded data summary:');
    console.log(`   🎯 ${primaryFocusAreas.length} Focus Areas`);
    console.log(`   📂 ${Object.values(workCategories).flat().length} Work Categories`);
    console.log(`   🔧 ${Object.values(workCategories).flat().reduce((total, cat) => total + cat.workTypes.length, 0)} Work Types`);
    console.log(`   ⚡ ${skills.length} Skills`);
    console.log(`   🔗 ${Object.values(workTypeToSkills).flat().length} Work Type-Skill mappings`);

  } catch (error) {
    console.error('❌ Error during reference data seeding:', error);
    throw error;
  }
}

async function main() {
  await seedReferenceData();
}

main()
  .catch((e) => {
    console.error('❌ Reference data seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });