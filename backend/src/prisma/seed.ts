import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth.utils';
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

// Work Categories organized by focus area
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
        { id: 'technical-architecture', label: 'Technical Architecture' },
        { id: 'scalability-planning', label: 'Scalability Planning' },
        { id: 'technology-decisions', label: 'Technology Decisions' },
        { id: 'performance-architecture', label: 'Performance Architecture' },
        { id: 'security-architecture', label: 'Security Architecture' },
        { id: 'integration-architecture', label: 'Integration Architecture' },
        { id: 'architecture-documentation', label: 'Architecture Documentation' }
      ]
    },
    {
      id: 'devops',
      label: 'DevOps',
      workTypes: [
        { id: 'deployment-automation', label: 'Deployment Automation' },
        { id: 'infrastructure-management', label: 'Infrastructure Management' },
        { id: 'monitoring-alerting', label: 'Monitoring & Alerting' },
        { id: 'ci-cd-pipelines', label: 'CI/CD Pipelines' },
        { id: 'containerization', label: 'Containerization' },
        { id: 'cloud-services', label: 'Cloud Services' },
        { id: 'security-compliance', label: 'Security & Compliance' },
        { id: 'disaster-recovery', label: 'Disaster Recovery' }
      ]
    },
    {
      id: 'mobile-development',
      label: 'Mobile Development',
      workTypes: [
        { id: 'native-ios', label: 'Native iOS Development' },
        { id: 'native-android', label: 'Native Android Development' },
        { id: 'cross-platform-mobile', label: 'Cross-Platform Mobile' },
        { id: 'mobile-ui-implementation', label: 'Mobile UI Implementation' },
        { id: 'mobile-performance', label: 'Mobile Performance' },
        { id: 'app-store-optimization', label: 'App Store Optimization' },
        { id: 'mobile-testing', label: 'Mobile Testing' },
        { id: 'mobile-security', label: 'Mobile Security' }
      ]
    },
    {
      id: 'development-testing',
      label: 'Development Testing',
      workTypes: [
        { id: 'unit-testing', label: 'Unit Testing' },
        { id: 'integration-testing', label: 'Integration Testing' },
        { id: 'end-to-end-testing', label: 'End-to-End Testing' },
        { id: 'performance-testing', label: 'Performance Testing' },
        { id: 'security-testing', label: 'Security Testing' },
        { id: 'automated-testing', label: 'Automated Testing' },
        { id: 'test-infrastructure', label: 'Test Infrastructure' },
        { id: 'quality-assurance', label: 'Quality Assurance' }
      ]
    },
    {
      id: 'code-documentation',
      label: 'Code Documentation',
      workTypes: [
        { id: 'api-documentation', label: 'API Documentation' },
        { id: 'code-comments', label: 'Code Comments & Documentation' },
        { id: 'technical-specs', label: 'Technical Specifications' },
        { id: 'architecture-docs', label: 'Architecture Documentation' },
        { id: 'developer-guides', label: 'Developer Guides' },
        { id: 'deployment-docs', label: 'Deployment Documentation' },
        { id: 'troubleshooting-guides', label: 'Troubleshooting Guides' },
        { id: 'onboarding-docs', label: 'Developer Onboarding Documentation' }
      ]
    },
    {
      id: 'data-engineering',
      label: 'Data Engineering',
      workTypes: [
        { id: 'data-pipelines', label: 'Data Pipelines' },
        { id: 'data-modeling', label: 'Data Modeling' },
        { id: 'etl-processes', label: 'ETL Processes' },
        { id: 'data-warehouse', label: 'Data Warehouse Management' },
        { id: 'data-integration', label: 'Data Integration' },
        { id: 'data-quality', label: 'Data Quality & Validation' },
        { id: 'big-data-processing', label: 'Big Data Processing' },
        { id: 'data-analytics-infrastructure', label: 'Data Analytics Infrastructure' }
      ]
    }
  ],
  'design': [
    {
      id: 'user-research',
      label: 'User Research',
      workTypes: [
        { id: 'user-interviews', label: 'User Interviews' },
        { id: 'surveys-feedback', label: 'Surveys & Feedback Collection' },
        { id: 'usability-testing', label: 'Usability Testing' },
        { id: 'user-personas', label: 'User Personas & Journey Mapping' },
        { id: 'competitive-analysis', label: 'Competitive Analysis' },
        { id: 'user-analytics', label: 'User Analytics & Behavior Analysis' },
        { id: 'research-synthesis', label: 'Research Synthesis' },
        { id: 'stakeholder-research', label: 'Stakeholder Research' }
      ]
    },
    {
      id: 'ux-planning',
      label: 'UX Planning',
      workTypes: [
        { id: 'information-architecture', label: 'Information Architecture' },
        { id: 'user-flows', label: 'User Flows & Task Analysis' },
        { id: 'wireframing', label: 'Wireframing & Low-Fidelity Design' },
        { id: 'content-strategy', label: 'Content Strategy' },
        { id: 'feature-prioritization', label: 'Feature Prioritization' },
        { id: 'ux-strategy', label: 'UX Strategy & Planning' },
        { id: 'accessibility-planning', label: 'Accessibility Planning' },
        { id: 'design-requirements', label: 'Design Requirements Gathering' }
      ]
    },
    {
      id: 'interaction-design',
      label: 'Interaction Design',
      workTypes: [
        { id: 'prototyping', label: 'Interactive Prototyping' },
        { id: 'micro-interactions', label: 'Micro-interactions & Animations' },
        { id: 'navigation-design', label: 'Navigation & Menu Design' },
        { id: 'form-design', label: 'Form & Input Design' },
        { id: 'responsive-interaction', label: 'Responsive Interaction Design' },
        { id: 'gesture-design', label: 'Touch & Gesture Design' },
        { id: 'transition-design', label: 'Transition & State Design' },
        { id: 'accessibility-interaction', label: 'Accessible Interaction Design' }
      ]
    },
    {
      id: 'visual-design',
      label: 'Visual Design',
      workTypes: [
        { id: 'ui-design', label: 'UI Design & Visual Styling' },
        { id: 'brand-application', label: 'Brand Application in Digital Products' },
        { id: 'icon-illustration', label: 'Icon & Illustration Design' },
        { id: 'typography', label: 'Typography & Text Hierarchy' },
        { id: 'color-theory', label: 'Color Theory & Palettes' },
        { id: 'layout-composition', label: 'Layout & Composition' },
        { id: 'visual-hierarchy', label: 'Visual Hierarchy & Information Design' },
        { id: 'graphic-elements', label: 'Graphic Elements & Visual Assets' }
      ]
    },
    {
      id: 'design-systems',
      label: 'Design Systems',
      workTypes: [
        { id: 'component-libraries', label: 'Component Libraries & Pattern Libraries' },
        { id: 'design-tokens', label: 'Design Tokens & Variables' },
        { id: 'style-guides', label: 'Style Guides & Brand Guidelines' },
        { id: 'design-standards', label: 'Design Standards & Governance' },
        { id: 'component-documentation', label: 'Component Documentation' },
        { id: 'design-system-maintenance', label: 'Design System Maintenance & Evolution' },
        { id: 'cross-platform-consistency', label: 'Cross-Platform Design Consistency' },
        { id: 'design-system-adoption', label: 'Design System Adoption & Training' }
      ]
    },
    {
      id: 'design-collaboration',
      label: 'Design Collaboration',
      workTypes: [
        { id: 'design-reviews', label: 'Design Reviews & Critique' },
        { id: 'stakeholder-presentations', label: 'Stakeholder Presentations' },
        { id: 'developer-handoff', label: 'Developer Handoff & Specifications' },
        { id: 'design-workshops', label: 'Design Workshops & Ideation Sessions' },
        { id: 'cross-team-collaboration', label: 'Cross-Team Design Collaboration' },
        { id: 'client-collaboration', label: 'Client & External Collaboration' },
        { id: 'design-mentoring', label: 'Design Mentoring & Knowledge Sharing' },
        { id: 'design-process-improvement', label: 'Design Process Improvement' }
      ]
    },
    {
      id: 'specialized-design',
      label: 'Specialized Design',
      workTypes: [
        { id: 'mobile-design', label: 'Mobile-First & App Design' },
        { id: 'web-design', label: 'Web Design & Desktop Applications' },
        { id: 'dashboard-design', label: 'Dashboard & Data Visualization Design' },
        { id: 'ecommerce-design', label: 'E-commerce & Conversion Design' },
        { id: 'saas-design', label: 'SaaS & B2B Product Design' },
        { id: 'gaming-ui', label: 'Gaming & Interactive Media UI' },
        { id: 'ar-vr-design', label: 'AR/VR & Immersive Experience Design' },
        { id: 'voice-interface', label: 'Voice Interface & Conversational Design' }
      ]
    },
    {
      id: 'design-testing-validation',
      label: 'Design Testing & Validation',
      workTypes: [
        { id: 'a-b-testing', label: 'A/B Testing & Experimentation' },
        { id: 'design-metrics', label: 'Design Metrics & Success Measurement' },
        { id: 'prototype-testing', label: 'Prototype Testing & Validation' },
        { id: 'accessibility-testing', label: 'Accessibility Testing & Compliance' },
        { id: 'cross-browser-design-testing', label: 'Cross-Browser & Device Testing' },
        { id: 'performance-impact-testing', label: 'Design Performance Impact Testing' },
        { id: 'user-acceptance-testing', label: 'User Acceptance Testing' },
        { id: 'design-quality-assurance', label: 'Design Quality Assurance' }
      ]
    }
  ],
  'product-management': [
    {
      id: 'product-strategy',
      label: 'Product Strategy',
      workTypes: [
        { id: 'product-vision', label: 'Product Vision & Strategy Development' },
        { id: 'market-research', label: 'Market Research & Analysis' },
        { id: 'competitive-intelligence', label: 'Competitive Intelligence' },
        { id: 'product-roadmapping', label: 'Product Roadmapping' },
        { id: 'stakeholder-alignment', label: 'Stakeholder Alignment & Communication' },
        { id: 'business-case-development', label: 'Business Case Development' },
        { id: 'go-to-market-strategy', label: 'Go-to-Market Strategy' },
        { id: 'product-positioning', label: 'Product Positioning & Messaging' }
      ]
    },
    {
      id: 'product-discovery',
      label: 'Product Discovery',
      workTypes: [
        { id: 'customer-research', label: 'Customer Research & Insights' },
        { id: 'problem-validation', label: 'Problem Validation' },
        { id: 'opportunity-assessment', label: 'Opportunity Assessment' },
        { id: 'user-story-creation', label: 'User Story Creation & Refinement' },
        { id: 'feature-ideation', label: 'Feature Ideation & Brainstorming' },
        { id: 'solution-validation', label: 'Solution Validation & Testing' },
        { id: 'mvp-definition', label: 'MVP Definition & Scoping' },
        { id: 'hypothesis-testing', label: 'Hypothesis Testing & Experimentation' }
      ]
    },
    {
      id: 'requirements',
      label: 'Requirements',
      workTypes: [
        { id: 'requirements-gathering', label: 'Requirements Gathering & Analysis' },
        { id: 'user-acceptance-criteria', label: 'User Acceptance Criteria Definition' },
        { id: 'technical-requirements', label: 'Technical Requirements Specification' },
        { id: 'business-requirements', label: 'Business Requirements Documentation' },
        { id: 'functional-specifications', label: 'Functional Specifications' },
        { id: 'non-functional-requirements', label: 'Non-Functional Requirements' },
        { id: 'requirements-prioritization', label: 'Requirements Prioritization' },
        { id: 'change-management', label: 'Requirements Change Management' }
      ]
    },
    {
      id: 'product-execution',
      label: 'Product Execution',
      workTypes: [
        { id: 'sprint-planning', label: 'Sprint Planning & Backlog Management' },
        { id: 'agile-facilitation', label: 'Agile Ceremonies & Facilitation' },
        { id: 'cross-team-coordination', label: 'Cross-Team Coordination' },
        { id: 'release-planning', label: 'Release Planning & Management' },
        { id: 'quality-assurance-coordination', label: 'Quality Assurance Coordination' },
        { id: 'user-acceptance-testing-coordination', label: 'User Acceptance Testing Coordination' },
        { id: 'launch-coordination', label: 'Product Launch Coordination' },
        { id: 'post-launch-monitoring', label: 'Post-Launch Monitoring & Iteration' }
      ]
    },
    {
      id: 'product-analysis',
      label: 'Product Analysis',
      workTypes: [
        { id: 'product-metrics', label: 'Product Metrics & KPI Tracking' },
        { id: 'user-behavior-analysis', label: 'User Behavior Analysis' },
        { id: 'conversion-optimization', label: 'Conversion & Funnel Optimization' },
        { id: 'cohort-analysis', label: 'Cohort & Retention Analysis' },
        { id: 'feature-performance', label: 'Feature Performance Analysis' },
        { id: 'business-impact-measurement', label: 'Business Impact Measurement' },
        { id: 'data-driven-decisions', label: 'Data-Driven Decision Making' },
        { id: 'performance-reporting', label: 'Performance Reporting & Communication' }
      ]
    },
    {
      id: 'product-documentation',
      label: 'Product Documentation',
      workTypes: [
        { id: 'product-specifications', label: 'Product Specifications & Documentation' },
        { id: 'user-documentation', label: 'User Documentation & Help Content' },
        { id: 'api-documentation-coordination', label: 'API Documentation Coordination' },
        { id: 'release-notes', label: 'Release Notes & Change Communication' },
        { id: 'training-materials', label: 'Training Materials & User Guides' },
        { id: 'internal-documentation', label: 'Internal Process Documentation' },
        { id: 'compliance-documentation', label: 'Compliance & Regulatory Documentation' },
        { id: 'knowledge-base', label: 'Knowledge Base Management' }
      ]
    },
    {
      id: 'customer-success',
      label: 'Customer Success',
      workTypes: [
        { id: 'customer-feedback', label: 'Customer Feedback Collection & Analysis' },
        { id: 'user-onboarding', label: 'User Onboarding & Activation' },
        { id: 'customer-support-coordination', label: 'Customer Support Coordination' },
        { id: 'customer-advocacy', label: 'Customer Advocacy & Success Stories' },
        { id: 'churn-analysis', label: 'Churn Analysis & Prevention' },
        { id: 'customer-health-monitoring', label: 'Customer Health Monitoring' },
        { id: 'customer-journey-optimization', label: 'Customer Journey Optimization' },
        { id: 'customer-communication', label: 'Customer Communication & Updates' }
      ]
    },
    {
      id: 'product-growth',
      label: 'Product Growth',
      workTypes: [
        { id: 'growth-experimentation', label: 'Growth Experimentation & Testing' },
        { id: 'user-acquisition', label: 'User Acquisition Strategy' },
        { id: 'retention-optimization', label: 'User Retention & Engagement Optimization' },
        { id: 'viral-mechanics', label: 'Viral & Referral Mechanics' },
        { id: 'monetization-strategy', label: 'Monetization Strategy & Optimization' },
        { id: 'pricing-strategy', label: 'Pricing Strategy & Testing' },
        { id: 'market-expansion', label: 'Market Expansion & Localization' },
        { id: 'partnership-products', label: 'Partnership & Integration Products' }
      ]
    }
  ],
  'marketing': [
    {
      id: 'marketing-strategy',
      label: 'Marketing Strategy',
      workTypes: [
        { id: 'brand-strategy', label: 'Brand Strategy & Positioning' },
        { id: 'market-segmentation', label: 'Market Segmentation & Targeting' },
        { id: 'marketing-planning', label: 'Marketing Planning & Campaign Development' },
        { id: 'competitive-marketing-analysis', label: 'Competitive Marketing Analysis' },
        { id: 'customer-journey-mapping', label: 'Customer Journey & Touchpoint Mapping' },
        { id: 'marketing-budget-planning', label: 'Marketing Budget Planning & Allocation' },
        { id: 'marketing-channel-strategy', label: 'Marketing Channel Strategy' },
        { id: 'integrated-marketing-campaigns', label: 'Integrated Marketing Campaigns' }
      ]
    },
    {
      id: 'content-marketing',
      label: 'Content Marketing',
      workTypes: [
        { id: 'content-strategy', label: 'Content Strategy & Planning' },
        { id: 'blog-content-creation', label: 'Blog Content Creation & Management' },
        { id: 'video-content', label: 'Video Content Production & Marketing' },
        { id: 'social-media-content', label: 'Social Media Content Creation' },
        { id: 'email-marketing', label: 'Email Marketing & Newsletter Management' },
        { id: 'content-optimization', label: 'Content SEO & Optimization' },
        { id: 'thought-leadership', label: 'Thought Leadership & Industry Content' },
        { id: 'content-distribution', label: 'Content Distribution & Amplification' }
      ]
    },
    {
      id: 'digital-marketing',
      label: 'Digital Marketing',
      workTypes: [
        { id: 'paid-advertising', label: 'Paid Advertising & PPC Management' },
        { id: 'social-media-marketing', label: 'Social Media Marketing & Management' },
        { id: 'search-engine-optimization', label: 'Search Engine Optimization (SEO)' },
        { id: 'conversion-rate-optimization', label: 'Conversion Rate Optimization (CRO)' },
        { id: 'marketing-automation', label: 'Marketing Automation & Lead Nurturing' },
        { id: 'affiliate-marketing', label: 'Affiliate & Partnership Marketing' },
        { id: 'influencer-marketing', label: 'Influencer Marketing & Collaborations' },
        { id: 'retargeting-campaigns', label: 'Retargeting & Remarketing Campaigns' }
      ]
    },
    {
      id: 'event-marketing',
      label: 'Event Marketing',
      workTypes: [
        { id: 'conference-marketing', label: 'Conference & Trade Show Marketing' },
        { id: 'webinar-management', label: 'Webinar & Virtual Event Management' },
        { id: 'corporate-events', label: 'Corporate Event Planning & Execution' },
        { id: 'community-events', label: 'Community & Networking Events' },
        { id: 'product-launches', label: 'Product Launch Events & Campaigns' },
        { id: 'sponsorship-management', label: 'Sponsorship & Partnership Events' },
        { id: 'event-promotion', label: 'Event Promotion & Registration Management' },
        { id: 'event-follow-up', label: 'Event Follow-up & Lead Management' }
      ]
    },
    {
      id: 'product-marketing',
      label: 'Product Marketing',
      workTypes: [
        { id: 'product-positioning', label: 'Product Positioning & Messaging' },
        { id: 'go-to-market-execution', label: 'Go-to-Market Strategy Execution' },
        { id: 'competitive-analysis', label: 'Competitive Analysis & Intelligence' },
        { id: 'sales-enablement', label: 'Sales Enablement & Support Materials' },
        { id: 'product-launches', label: 'Product Launch Planning & Execution' },
        { id: 'customer-case-studies', label: 'Customer Case Studies & Success Stories' },
        { id: 'pricing-communication', label: 'Pricing Strategy Communication' },
        { id: 'product-education', label: 'Product Education & Training Content' }
      ]
    },
    {
      id: 'brand-management',
      label: 'Brand Management',
      workTypes: [
        { id: 'brand-identity', label: 'Brand Identity & Visual Guidelines' },
        { id: 'brand-voice', label: 'Brand Voice & Messaging Framework' },
        { id: 'brand-consistency', label: 'Brand Consistency & Governance' },
        { id: 'brand-partnerships', label: 'Brand Partnerships & Collaborations' },
        { id: 'reputation-management', label: 'Brand Reputation & Crisis Management' },
        { id: 'brand-research', label: 'Brand Research & Perception Studies' },
        { id: 'brand-evolution', label: 'Brand Evolution & Refresh Initiatives' },
        { id: 'brand-activation', label: 'Brand Activation & Experience Design' }
      ]
    },
    {
      id: 'creative-services',
      label: 'Creative Services',
      workTypes: [
        { id: 'graphic-design', label: 'Graphic Design & Visual Assets' },
        { id: 'campaign-creative', label: 'Campaign Creative Development' },
        { id: 'video-production', label: 'Video Production & Motion Graphics' },
        { id: 'photography', label: 'Photography & Visual Content Creation' },
        { id: 'copywriting', label: 'Copywriting & Marketing Content' },
        { id: 'creative-direction', label: 'Creative Direction & Concept Development' },
        { id: 'print-design', label: 'Print Design & Collateral Materials' },
        { id: 'digital-assets', label: 'Digital Asset Creation & Management' }
      ]
    },
    {
      id: 'growth-marketing',
      label: 'Growth Marketing',
      workTypes: [
        { id: 'growth-experimentation', label: 'Growth Experimentation & A/B Testing' },
        { id: 'user-acquisition', label: 'User Acquisition & Customer Acquisition' },
        { id: 'retention-marketing', label: 'Retention & Lifecycle Marketing' },
        { id: 'referral-programs', label: 'Referral & Viral Marketing Programs' },
        { id: 'conversion-optimization', label: 'Conversion Funnel Optimization' },
        { id: 'growth-analytics', label: 'Growth Analytics & Performance Measurement' },
        { id: 'product-led-growth', label: 'Product-Led Growth Strategies' },
        { id: 'customer-lifecycle', label: 'Customer Lifecycle & Value Optimization' }
      ]
    }
  ],
  'sales': [
    {
      id: 'sales-prospecting',
      label: 'Sales Prospecting',
      workTypes: [
        { id: 'lead-generation', label: 'Lead Generation & Qualification' },
        { id: 'cold-outreach', label: 'Cold Outreach & Initial Contact' },
        { id: 'prospect-research', label: 'Prospect Research & Account Intelligence' },
        { id: 'lead-nurturing', label: 'Lead Nurturing & Relationship Building' },
        { id: 'referral-generation', label: 'Referral Generation & Network Building' },
        { id: 'sales-prospecting-automation', label: 'Sales Automation & CRM Management' },
        { id: 'social-selling', label: 'Social Selling & Digital Prospecting' },
        { id: 'territory-planning', label: 'Territory Planning & Account Mapping' }
      ]
    },
    {
      id: 'opportunity-management',
      label: 'Opportunity Management',
      workTypes: [
        { id: 'sales-presentations', label: 'Sales Presentations & Demonstrations' },
        { id: 'needs-assessment', label: 'Customer Needs Assessment & Discovery' },
        { id: 'proposal-development', label: 'Proposal Development & Pricing' },
        { id: 'objection-handling', label: 'Objection Handling & Negotiation' },
        { id: 'stakeholder-management', label: 'Stakeholder Management & Influence' },
        { id: 'deal-strategy', label: 'Deal Strategy & Competitive Positioning' },
        { id: 'contract-negotiation', label: 'Contract Negotiation & Closing' },
        { id: 'sales-forecasting', label: 'Sales Forecasting & Pipeline Management' }
      ]
    },
    {
      id: 'account-management',
      label: 'Account Management',
      workTypes: [
        { id: 'customer-relationship-management', label: 'Customer Relationship Management' },
        { id: 'account-growth', label: 'Account Growth & Expansion' },
        { id: 'customer-success-partnership', label: 'Customer Success Partnership' },
        { id: 'renewal-management', label: 'Contract Renewal & Retention' },
        { id: 'upselling-cross-selling', label: 'Upselling & Cross-Selling' },
        { id: 'strategic-account-planning', label: 'Strategic Account Planning' },
        { id: 'customer-advocacy', label: 'Customer Advocacy & References' },
        { id: 'account-health-monitoring', label: 'Account Health Monitoring & Risk Management' }
      ]
    },
    {
      id: 'sales-operations',
      label: 'Sales Operations',
      workTypes: [
        { id: 'sales-process-optimization', label: 'Sales Process Optimization' },
        { id: 'sales-training', label: 'Sales Training & Enablement' },
        { id: 'crm-administration', label: 'CRM Administration & Data Management' },
        { id: 'sales-analytics', label: 'Sales Analytics & Performance Reporting' },
        { id: 'sales-tool-management', label: 'Sales Tool Management & Integration' },
        { id: 'compensation-planning', label: 'Sales Compensation & Incentive Planning' },
        { id: 'sales-methodology', label: 'Sales Methodology & Framework Development' },
        { id: 'sales-team-management', label: 'Sales Team Management & Coaching' }
      ]
    }
  ],
  'operations': [
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      workTypes: [
        { id: 'server-management', label: 'Server Management & Maintenance' },
        { id: 'network-administration', label: 'Network Administration & Security' },
        { id: 'database-administration', label: 'Database Administration & Optimization' },
        { id: 'cloud-infrastructure', label: 'Cloud Infrastructure Management' },
        { id: 'backup-recovery', label: 'Backup & Disaster Recovery' },
        { id: 'security-operations', label: 'Security Operations & Compliance' },
        { id: 'monitoring-logging', label: 'System Monitoring & Logging' },
        { id: 'capacity-planning', label: 'Capacity Planning & Resource Management' }
      ]
    },
    {
      id: 'devops-pipelines',
      label: 'DevOps Pipelines',
      workTypes: [
        { id: 'ci-cd-setup', label: 'CI/CD Pipeline Setup & Management' },
        { id: 'deployment-automation', label: 'Deployment Automation & Orchestration' },
        { id: 'infrastructure-as-code', label: 'Infrastructure as Code' },
        { id: 'container-orchestration', label: 'Container Orchestration & Management' },
        { id: 'environment-management', label: 'Environment Management & Configuration' },
        { id: 'release-management', label: 'Release Management & Rollback Strategies' },
        { id: 'pipeline-optimization', label: 'Pipeline Optimization & Performance' },
        { id: 'devops-toolchain', label: 'DevOps Toolchain Integration & Management' }
      ]
    }
  ],
  'finance': [
    {
      id: 'accounting',
      label: 'Accounting',
      workTypes: [
        { id: 'financial-reporting', label: 'Financial Reporting & Analysis' },
        { id: 'budget-planning', label: 'Budget Planning & Forecasting' },
        { id: 'accounts-payable-receivable', label: 'Accounts Payable & Receivable' },
        { id: 'tax-compliance', label: 'Tax Compliance & Preparation' },
        { id: 'audit-coordination', label: 'Audit Coordination & Support' },
        { id: 'financial-controls', label: 'Financial Controls & Risk Management' },
        { id: 'cost-accounting', label: 'Cost Accounting & Analysis' },
        { id: 'financial-planning', label: 'Strategic Financial Planning' }
      ]
    }
  ],
  'hr': [
    {
      id: 'talent-acquisition',
      label: 'Talent Acquisition',
      workTypes: [
        { id: 'recruitment-strategy', label: 'Recruitment Strategy & Planning' },
        { id: 'candidate-sourcing', label: 'Candidate Sourcing & Outreach' },
        { id: 'interviewing', label: 'Interviewing & Assessment' },
        { id: 'employer-branding', label: 'Employer Branding & Candidate Experience' },
        { id: 'onboarding-coordination', label: 'New Hire Onboarding Coordination' },
        { id: 'talent-pipeline', label: 'Talent Pipeline Development' },
        { id: 'diversity-inclusion-hiring', label: 'Diversity & Inclusion in Hiring' },
        { id: 'recruitment-metrics', label: 'Recruitment Metrics & Analytics' }
      ]
    }
  ],
  'legal': [
    {
      id: 'contract-management',
      label: 'Contract Management',
      workTypes: [
        { id: 'contract-drafting', label: 'Contract Drafting & Review' },
        { id: 'vendor-agreements', label: 'Vendor & Supplier Agreement Management' },
        { id: 'employment-contracts', label: 'Employment Contract Management' },
        { id: 'intellectual-property', label: 'Intellectual Property Management' },
        { id: 'compliance-monitoring', label: 'Legal Compliance Monitoring' },
        { id: 'risk-assessment', label: 'Legal Risk Assessment & Mitigation' },
        { id: 'regulatory-compliance', label: 'Regulatory Compliance & Reporting' },
        { id: 'legal-documentation', label: 'Legal Documentation & Policy Development' }
      ]
    }
  ]
};

// Complete skills array (148 skills)
const skills = [
  // Programming Languages
  { id: 'javascript', name: 'JavaScript', category: 'Technical' },
  { id: 'typescript', name: 'TypeScript', category: 'Technical' },
  { id: 'python', name: 'Python', category: 'Technical' },
  { id: 'java', name: 'Java', category: 'Technical' },
  { id: 'csharp', name: 'C#', category: 'Technical' },
  { id: 'php', name: 'PHP', category: 'Technical' },
  { id: 'ruby', name: 'Ruby', category: 'Technical' },
  { id: 'go', name: 'Go', category: 'Technical' },
  { id: 'rust', name: 'Rust', category: 'Technical' },
  { id: 'swift', name: 'Swift', category: 'Technical' },
  { id: 'kotlin', name: 'Kotlin', category: 'Technical' },
  { id: 'scala', name: 'Scala', category: 'Technical' },
  { id: 'cpp', name: 'C++', category: 'Technical' },
  { id: 'sql', name: 'SQL', category: 'Technical' },
  { id: 'r', name: 'R', category: 'Technical' },

  // Frontend Frameworks & Libraries
  { id: 'react', name: 'React', category: 'Technical' },
  { id: 'vue', name: 'Vue.js', category: 'Technical' },
  { id: 'angular', name: 'Angular', category: 'Technical' },
  { id: 'svelte', name: 'Svelte', category: 'Technical' },
  { id: 'nextjs', name: 'Next.js', category: 'Technical' },
  { id: 'nuxtjs', name: 'Nuxt.js', category: 'Technical' },
  { id: 'gatsby', name: 'Gatsby', category: 'Technical' },
  { id: 'remix', name: 'Remix', category: 'Technical' },

  // Backend Frameworks
  { id: 'nodejs', name: 'Node.js', category: 'Technical' },
  { id: 'express', name: 'Express.js', category: 'Technical' },
  { id: 'fastapi', name: 'FastAPI', category: 'Technical' },
  { id: 'django', name: 'Django', category: 'Technical' },
  { id: 'flask', name: 'Flask', category: 'Technical' },
  { id: 'spring', name: 'Spring Framework', category: 'Technical' },
  { id: 'laravel', name: 'Laravel', category: 'Technical' },
  { id: 'rails', name: 'Ruby on Rails', category: 'Technical' },
  { id: 'aspnet', name: 'ASP.NET', category: 'Technical' },

  // Databases
  { id: 'postgresql', name: 'PostgreSQL', category: 'Technical' },
  { id: 'mysql', name: 'MySQL', category: 'Technical' },
  { id: 'mongodb', name: 'MongoDB', category: 'Technical' },
  { id: 'redis', name: 'Redis', category: 'Technical' },
  { id: 'elasticsearch', name: 'Elasticsearch', category: 'Technical' },
  { id: 'cassandra', name: 'Cassandra', category: 'Technical' },
  { id: 'dynamodb', name: 'DynamoDB', category: 'Technical' },

  // Cloud & DevOps
  { id: 'aws', name: 'AWS', category: 'Technical' },
  { id: 'azure', name: 'Microsoft Azure', category: 'Technical' },
  { id: 'gcp', name: 'Google Cloud Platform', category: 'Technical' },
  { id: 'docker', name: 'Docker', category: 'Technical' },
  { id: 'kubernetes', name: 'Kubernetes', category: 'Technical' },
  { id: 'terraform', name: 'Terraform', category: 'Technical' },
  { id: 'ansible', name: 'Ansible', category: 'Technical' },
  { id: 'jenkins', name: 'Jenkins', category: 'Technical' },
  { id: 'gitlab-ci', name: 'GitLab CI/CD', category: 'Technical' },
  { id: 'github-actions', name: 'GitHub Actions', category: 'Technical' },

  // Frontend Technologies
  { id: 'html5', name: 'HTML5', category: 'Technical' },
  { id: 'css3', name: 'CSS3', category: 'Technical' },
  { id: 'sass', name: 'Sass/SCSS', category: 'Technical' },
  { id: 'tailwindcss', name: 'Tailwind CSS', category: 'Technical' },
  { id: 'bootstrap', name: 'Bootstrap', category: 'Technical' },
  { id: 'webpack', name: 'Webpack', category: 'Technical' },
  { id: 'vite', name: 'Vite', category: 'Technical' },
  { id: 'parcel', name: 'Parcel', category: 'Technical' },

  // Mobile Development
  { id: 'react-native', name: 'React Native', category: 'Technical' },
  { id: 'flutter', name: 'Flutter', category: 'Technical' },
  { id: 'ionic', name: 'Ionic', category: 'Technical' },
  { id: 'xamarin', name: 'Xamarin', category: 'Technical' },
  { id: 'ios-development', name: 'iOS Development', category: 'Technical' },
  { id: 'android-development', name: 'Android Development', category: 'Technical' },

  // Testing
  { id: 'jest', name: 'Jest', category: 'Technical' },
  { id: 'cypress', name: 'Cypress', category: 'Technical' },
  { id: 'selenium', name: 'Selenium', category: 'Technical' },
  { id: 'playwright', name: 'Playwright', category: 'Technical' },
  { id: 'junit', name: 'JUnit', category: 'Technical' },
  { id: 'pytest', name: 'PyTest', category: 'Technical' },

  // Design Tools
  { id: 'figma', name: 'Figma', category: 'Design' },
  { id: 'sketch', name: 'Sketch', category: 'Design' },
  { id: 'adobe-xd', name: 'Adobe XD', category: 'Design' },
  { id: 'photoshop', name: 'Adobe Photoshop', category: 'Design' },
  { id: 'illustrator', name: 'Adobe Illustrator', category: 'Design' },
  { id: 'indesign', name: 'Adobe InDesign', category: 'Design' },
  { id: 'after-effects', name: 'Adobe After Effects', category: 'Design' },
  { id: 'framer', name: 'Framer', category: 'Design' },
  { id: 'invision', name: 'InVision', category: 'Design' },
  { id: 'principle', name: 'Principle', category: 'Design' },

  // Design Skills
  { id: 'ui-design', name: 'UI Design', category: 'Design' },
  { id: 'ux-design', name: 'UX Design', category: 'Design' },
  { id: 'user-research', name: 'User Research', category: 'Design' },
  { id: 'wireframing', name: 'Wireframing', category: 'Design' },
  { id: 'prototyping', name: 'Prototyping', category: 'Design' },
  { id: 'visual-design', name: 'Visual Design', category: 'Design' },
  { id: 'interaction-design', name: 'Interaction Design', category: 'Design' },
  { id: 'design-systems', name: 'Design Systems', category: 'Design' },
  { id: 'typography', name: 'Typography', category: 'Design' },
  { id: 'color-theory', name: 'Color Theory', category: 'Design' },
  { id: 'brand-design', name: 'Brand Design', category: 'Design' },
  { id: 'motion-graphics', name: 'Motion Graphics', category: 'Design' },

  // Data & Analytics
  { id: 'data-analysis', name: 'Data Analysis', category: 'Technical' },
  { id: 'machine-learning', name: 'Machine Learning', category: 'Technical' },
  { id: 'data-visualization', name: 'Data Visualization', category: 'Technical' },
  { id: 'tableau', name: 'Tableau', category: 'Technical' },
  { id: 'power-bi', name: 'Power BI', category: 'Technical' },
  { id: 'google-analytics', name: 'Google Analytics', category: 'Technical' },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Technical' },
  { id: 'amplitude', name: 'Amplitude', category: 'Technical' },

  // Marketing & Business
  { id: 'seo', name: 'SEO', category: 'Professional' },
  { id: 'sem', name: 'SEM', category: 'Professional' },
  { id: 'content-marketing', name: 'Content Marketing', category: 'Professional' },
  { id: 'email-marketing', name: 'Email Marketing', category: 'Professional' },
  { id: 'social-media-marketing', name: 'Social Media Marketing', category: 'Professional' },
  { id: 'ppc-advertising', name: 'PPC Advertising', category: 'Professional' },
  { id: 'conversion-optimization', name: 'Conversion Optimization', category: 'Professional' },
  { id: 'marketing-automation', name: 'Marketing Automation', category: 'Professional' },
  { id: 'brand-management', name: 'Brand Management', category: 'Professional' },
  { id: 'product-marketing', name: 'Product Marketing', category: 'Professional' },

  // Project Management
  { id: 'agile', name: 'Agile Methodology', category: 'Professional' },
  { id: 'scrum', name: 'Scrum', category: 'Professional' },
  { id: 'kanban', name: 'Kanban', category: 'Professional' },
  { id: 'jira', name: 'Jira', category: 'Professional' },
  { id: 'asana', name: 'Asana', category: 'Professional' },
  { id: 'trello', name: 'Trello', category: 'Professional' },
  { id: 'monday', name: 'Monday.com', category: 'Professional' },
  { id: 'notion', name: 'Notion', category: 'Professional' },

  // Business Analysis
  { id: 'business-analysis', name: 'Business Analysis', category: 'Professional' },
  { id: 'requirements-gathering', name: 'Requirements Gathering', category: 'Professional' },
  { id: 'process-improvement', name: 'Process Improvement', category: 'Professional' },
  { id: 'stakeholder-management', name: 'Stakeholder Management', category: 'Professional' },
  { id: 'financial-modeling', name: 'Financial Modeling', category: 'Professional' },
  { id: 'market-research', name: 'Market Research', category: 'Professional' },

  // Soft Skills
  { id: 'leadership', name: 'Leadership', category: 'Soft' },
  { id: 'communication', name: 'Communication', category: 'Soft' },
  { id: 'teamwork', name: 'Teamwork', category: 'Soft' },
  { id: 'problem-solving', name: 'Problem Solving', category: 'Soft' },
  { id: 'critical-thinking', name: 'Critical Thinking', category: 'Soft' },
  { id: 'adaptability', name: 'Adaptability', category: 'Soft' },
  { id: 'time-management', name: 'Time Management', category: 'Soft' },
  { id: 'mentoring', name: 'Mentoring', category: 'Soft' },
  { id: 'negotiation', name: 'Negotiation', category: 'Soft' },
  { id: 'presentation', name: 'Presentation Skills', category: 'Soft' },
  { id: 'customer-service', name: 'Customer Service', category: 'Soft' },
  { id: 'conflict-resolution', name: 'Conflict Resolution', category: 'Soft' }
];

// Work Type to Skills Mapping
const workTypeToSkills = {
  // Development - Frontend
  'ui-implementation': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html5', 'css3', 'sass', 'tailwindcss', 'bootstrap'],
  'state-management': ['react', 'vue', 'angular', 'javascript', 'typescript'],
  'frontend-performance': ['javascript', 'typescript', 'webpack', 'vite', 'parcel'],
  'user-experience-logic': ['javascript', 'typescript', 'react', 'vue', 'angular'],
  'animations-transitions': ['css3', 'sass', 'javascript', 'after-effects', 'motion-graphics'],
  'responsive-design': ['html5', 'css3', 'sass', 'tailwindcss', 'bootstrap'],
  'cross-browser-compatibility': ['html5', 'css3', 'javascript', 'typescript'],
  'frontend-accessibility': ['html5', 'css3', 'javascript', 'ui-design', 'ux-design'],

  // Development - Backend
  'api-development': ['nodejs', 'python', 'java', 'go', 'express', 'fastapi', 'spring', 'laravel'],
  'database-work': ['postgresql', 'mysql', 'mongodb', 'redis', 'sql', 'elasticsearch'],
  'business-logic': ['java', 'python', 'nodejs', 'csharp', 'go'],
  'integrations': ['nodejs', 'python', 'java', 'go', 'rest-apis', 'graphql'],
  'authentication-authorization': ['nodejs', 'python', 'java', 'csharp', 'jwt', 'oauth'],
  'caching-strategies': ['redis', 'mongodb', 'postgresql', 'mysql'],
  'background-jobs': ['nodejs', 'python', 'java', 'go', 'redis'],
  'microservices': ['nodejs', 'python', 'java', 'go', 'docker', 'kubernetes'],

  // Development - Architecture
  'system-design': ['problem-solving', 'critical-thinking', 'leadership'],
  'technical-architecture': ['problem-solving', 'critical-thinking', 'leadership'],
  'scalability-planning': ['aws', 'azure', 'gcp', 'kubernetes', 'docker'],
  'technology-decisions': ['leadership', 'critical-thinking', 'communication'],
  'performance-architecture': ['problem-solving', 'critical-thinking'],
  'security-architecture': ['problem-solving', 'critical-thinking'],
  'integration-architecture': ['problem-solving', 'critical-thinking', 'communication'],
  'architecture-documentation': ['communication', 'documentation'],

  // Development - DevOps
  'deployment-automation': ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'gitlab-ci', 'github-actions'],
  'infrastructure-management': ['aws', 'azure', 'gcp', 'terraform', 'ansible', 'kubernetes'],
  'monitoring-alerting': ['aws', 'azure', 'gcp', 'elasticsearch'],
  'ci-cd-pipelines': ['jenkins', 'gitlab-ci', 'github-actions', 'docker'],
  'containerization': ['docker', 'kubernetes'],
  'cloud-services': ['aws', 'azure', 'gcp'],
  'security-compliance': ['aws', 'azure', 'gcp', 'terraform'],
  'disaster-recovery': ['aws', 'azure', 'gcp', 'terraform'],

  // Development - Mobile
  'native-ios': ['swift', 'ios-development'],
  'native-android': ['kotlin', 'java', 'android-development'],
  'cross-platform-mobile': ['react-native', 'flutter', 'ionic', 'xamarin'],
  'mobile-ui-implementation': ['react-native', 'flutter', 'swift', 'kotlin'],
  'mobile-performance': ['react-native', 'flutter', 'swift', 'kotlin'],
  'app-store-optimization': ['marketing', 'seo'],
  'mobile-testing': ['jest', 'cypress', 'selenium'],
  'mobile-security': ['swift', 'kotlin', 'react-native', 'flutter'],

  // Development - Testing
  'unit-testing': ['jest', 'junit', 'pytest'],
  'integration-testing': ['jest', 'junit', 'pytest', 'cypress'],
  'end-to-end-testing': ['cypress', 'selenium', 'playwright'],
  'performance-testing': ['selenium', 'playwright'],
  'security-testing': ['selenium', 'playwright'],
  'automated-testing': ['jest', 'junit', 'pytest', 'cypress', 'selenium'],
  'test-infrastructure': ['docker', 'kubernetes', 'jenkins'],
  'quality-assurance': ['jest', 'cypress', 'selenium', 'critical-thinking'],

  // Development - Documentation
  'api-documentation': ['communication', 'documentation'],
  'code-comments': ['communication', 'documentation'],
  'technical-specs': ['communication', 'documentation', 'critical-thinking'],
  'architecture-docs': ['communication', 'documentation', 'critical-thinking'],
  'developer-guides': ['communication', 'documentation', 'mentoring'],
  'deployment-docs': ['communication', 'documentation'],
  'troubleshooting-guides': ['communication', 'documentation', 'problem-solving'],
  'onboarding-docs': ['communication', 'documentation', 'mentoring'],

  // Development - Data Engineering
  'data-pipelines': ['python', 'sql', 'aws', 'azure', 'gcp'],
  'data-modeling': ['sql', 'postgresql', 'mongodb', 'critical-thinking'],
  'etl-processes': ['python', 'sql', 'aws', 'azure'],
  'data-warehouse': ['sql', 'postgresql', 'aws', 'azure', 'gcp'],
  'data-integration': ['python', 'sql', 'aws', 'azure'],
  'data-quality': ['python', 'sql', 'critical-thinking'],
  'big-data-processing': ['python', 'sql', 'aws', 'azure', 'gcp'],
  'data-analytics-infrastructure': ['python', 'sql', 'aws', 'azure', 'tableau', 'power-bi'],

  // Design - User Research
  'user-interviews': ['communication', 'user-research', 'critical-thinking'],
  'surveys-feedback': ['user-research', 'critical-thinking', 'data-analysis'],
  'usability-testing': ['user-research', 'ux-design', 'critical-thinking'],
  'user-personas': ['user-research', 'ux-design', 'critical-thinking'],
  'competitive-analysis': ['user-research', 'market-research', 'critical-thinking'],
  'user-analytics': ['google-analytics', 'mixpanel', 'amplitude', 'data-analysis'],
  'research-synthesis': ['user-research', 'critical-thinking', 'communication'],
  'stakeholder-research': ['user-research', 'stakeholder-management', 'communication'],

  // Design - UX Planning
  'information-architecture': ['ux-design', 'wireframing', 'critical-thinking'],
  'user-flows': ['ux-design', 'wireframing', 'figma', 'sketch'],
  'wireframing': ['wireframing', 'figma', 'sketch', 'adobe-xd'],
  'feature-prioritization': ['ux-design', 'critical-thinking', 'stakeholder-management'],
  'ux-strategy': ['ux-design', 'critical-thinking', 'communication', 'leadership'],
  'accessibility-planning': ['ux-design', 'ui-design', 'critical-thinking'],
  'design-requirements': ['ux-design', 'requirements-gathering', 'communication'],

  // Design - Interaction Design
  'prototyping': ['prototyping', 'figma', 'sketch', 'adobe-xd', 'framer', 'principle'],
  'micro-interactions': ['interaction-design', 'figma', 'after-effects', 'motion-graphics'],
  'navigation-design': ['ux-design', 'ui-design', 'figma', 'sketch'],
  'form-design': ['ui-design', 'ux-design', 'figma', 'sketch'],
  'responsive-interaction': ['ui-design', 'ux-design', 'html5', 'css3'],
  'gesture-design': ['interaction-design', 'ux-design', 'mobile-design'],
  'transition-design': ['interaction-design', 'motion-graphics', 'after-effects'],
  'accessibility-interaction': ['ux-design', 'ui-design', 'accessibility'],

  // Design - Visual Design
  'ui-design': ['ui-design', 'figma', 'sketch', 'adobe-xd'],
  'brand-application': ['brand-design', 'visual-design', 'illustrator', 'photoshop'],
  'icon-illustration': ['illustrator', 'figma', 'sketch', 'visual-design'],
  'typography': ['typography', 'figma', 'sketch', 'indesign'],
  'color-theory': ['color-theory', 'visual-design', 'ui-design'],
  'layout-composition': ['visual-design', 'ui-design', 'figma', 'sketch'],
  'visual-hierarchy': ['visual-design', 'ui-design', 'typography'],
  'graphic-elements': ['visual-design', 'illustrator', 'photoshop', 'figma'],

  // Design - Design Systems
  'component-libraries': ['design-systems', 'figma', 'sketch', 'ui-design'],
  'design-tokens': ['design-systems', 'figma', 'ui-design'],
  'style-guides': ['design-systems', 'brand-design', 'visual-design'],
  'design-standards': ['design-systems', 'leadership', 'communication'],
  'component-documentation': ['design-systems', 'communication', 'documentation'],
  'design-system-maintenance': ['design-systems', 'leadership', 'communication'],
  'cross-platform-consistency': ['design-systems', 'ui-design', 'brand-design'],
  'design-system-adoption': ['design-systems', 'leadership', 'mentoring', 'communication'],

  // Design - Collaboration
  'design-reviews': ['communication', 'leadership', 'critical-thinking'],
  'stakeholder-presentations': ['presentation', 'communication', 'stakeholder-management'],
  'developer-handoff': ['figma', 'sketch', 'communication', 'technical-documentation'],
  'design-workshops': ['leadership', 'communication', 'facilitation'],
  'cross-team-collaboration': ['communication', 'teamwork', 'leadership'],
  'client-collaboration': ['communication', 'presentation', 'stakeholder-management'],
  'design-mentoring': ['mentoring', 'leadership', 'communication'],
  'design-process-improvement': ['leadership', 'process-improvement', 'critical-thinking'],

  // Design - Specialized Design
  'mobile-design': ['ui-design', 'ux-design', 'figma', 'sketch', 'mobile-first'],
  'web-design': ['ui-design', 'ux-design', 'html5', 'css3', 'figma'],
  'dashboard-design': ['ui-design', 'data-visualization', 'ux-design'],
  'ecommerce-design': ['ui-design', 'ux-design', 'conversion-optimization'],
  'saas-design': ['ui-design', 'ux-design', 'user-research'],
  'gaming-ui': ['ui-design', 'interaction-design', 'motion-graphics'],
  'ar-vr-design': ['3d-design', 'interaction-design', 'ux-design'],
  'voice-interface': ['ux-design', 'interaction-design', 'user-research'],

  // Design - Testing & Validation
  'a-b-testing': ['data-analysis', 'user-research', 'critical-thinking'],
  'design-metrics': ['data-analysis', 'google-analytics', 'mixpanel'],
  'prototype-testing': ['prototyping', 'user-research', 'usability-testing'],
  'accessibility-testing': ['accessibility', 'usability-testing', 'ux-design'],
  'cross-browser-design-testing': ['html5', 'css3', 'cross-browser-compatibility'],
  'performance-impact-testing': ['performance-testing', 'web-performance'],
  'user-acceptance-testing': ['user-research', 'usability-testing', 'communication'],
  'design-quality-assurance': ['quality-assurance', 'attention-to-detail', 'critical-thinking'],

  // Product Management skills mapping
  'product-vision': ['leadership', 'critical-thinking', 'communication', 'market-research'],
  'market-research': ['market-research', 'data-analysis', 'critical-thinking'],
  'competitive-intelligence': ['market-research', 'business-analysis', 'critical-thinking'],
  'product-roadmapping': ['leadership', 'communication', 'critical-thinking'],
  'stakeholder-alignment': ['stakeholder-management', 'communication', 'leadership'],
  'business-case-development': ['business-analysis', 'financial-modeling', 'communication'],
  'go-to-market-strategy': ['product-marketing', 'marketing', 'communication'],
  'product-positioning': ['product-marketing', 'brand-management', 'communication'],

  // Marketing skills mapping
  'brand-strategy': ['brand-management', 'marketing', 'communication'],
  'content-strategy': ['content-marketing', 'communication', 'seo'],
  'paid-advertising': ['ppc-advertising', 'marketing', 'data-analysis'],
  'email-marketing': ['email-marketing', 'marketing-automation', 'communication'],
  'social-media-marketing': ['social-media-marketing', 'communication', 'brand-management'],
  'seo-optimization': ['seo', 'content-marketing', 'data-analysis'],
  'conversion-optimization': ['conversion-optimization', 'data-analysis', 'marketing'],

  // Sales skills mapping
  'lead-generation': ['sales', 'communication', 'market-research'],
  'cold-outreach': ['communication', 'sales', 'persistence'],
  'sales-presentations': ['presentation', 'communication', 'sales'],
  'negotiation': ['negotiation', 'communication', 'critical-thinking'],
  'customer-relationship-management': ['customer-service', 'communication', 'relationship-building'],

  // Operations skills mapping
  'server-management': ['linux', 'aws', 'azure', 'gcp'],
  'database-administration': ['postgresql', 'mysql', 'mongodb', 'sql'],
  'ci-cd-setup': ['jenkins', 'gitlab-ci', 'github-actions', 'docker'],
  'infrastructure-as-code': ['terraform', 'ansible', 'aws', 'azure'],

  // Finance skills mapping
  'financial-reporting': ['financial-modeling', 'data-analysis', 'excel'],
  'budget-planning': ['financial-modeling', 'data-analysis', 'critical-thinking'],

  // HR skills mapping
  'recruitment-strategy': ['hr', 'communication', 'stakeholder-management'],
  'interviewing': ['communication', 'critical-thinking', 'hr'],

  // Legal skills mapping
  'contract-drafting': ['legal', 'communication', 'critical-thinking'],
  'compliance-monitoring': ['legal', 'critical-thinking', 'attention-to-detail']
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
    const benchmarksPath = path.join(__dirname, '../../skill-benchmarks-export.json');

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