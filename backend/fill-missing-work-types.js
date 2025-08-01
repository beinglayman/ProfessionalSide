const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define comprehensive work types for each work category
const workTypesByCategory = {
  // Development - Data Engineering
  'dev-data': [
    { id: 'dev-data-01-pipeline', label: 'Data Pipeline Development' },
    { id: 'dev-data-02-etl', label: 'ETL Processes' },
    { id: 'dev-data-03-warehousing', label: 'Data Warehousing' },
    { id: 'dev-data-04-modeling', label: 'Data Modeling' },
    { id: 'dev-data-05-streaming', label: 'Real-time Data Streaming' },
    { id: 'dev-data-06-analytics', label: 'Data Analytics Infrastructure' },
    { id: 'dev-data-07-quality', label: 'Data Quality & Validation' },
    { id: 'dev-data-zz-others', label: 'Others' }
  ],

  // Development - DevOps & Infrastructure
  'dev-devops': [
    { id: 'dev-devops-01-ci-cd', label: 'CI/CD Pipeline Development' },
    { id: 'dev-devops-02-containerization', label: 'Containerization & Orchestration' },
    { id: 'dev-devops-03-infrastructure', label: 'Infrastructure as Code' },
    { id: 'dev-devops-04-cloud', label: 'Cloud Platform Management' },
    { id: 'dev-devops-05-monitoring', label: 'Monitoring & Observability' },
    { id: 'dev-devops-06-security', label: 'DevSecOps Implementation' },
    { id: 'dev-devops-07-automation', label: 'Infrastructure Automation' },
    { id: 'dev-devops-zz-others', label: 'Others' }
  ],

  // Development - Full Stack Development
  'dev-fullstack': [
    { id: 'dev-fullstack-01-web-apps', label: 'Full Stack Web Applications' },
    { id: 'dev-fullstack-02-api-integration', label: 'Frontend-Backend Integration' },
    { id: 'dev-fullstack-03-database', label: 'Database Design & Management' },
    { id: 'dev-fullstack-04-architecture', label: 'Application Architecture' },
    { id: 'dev-fullstack-05-deployment', label: 'Full Stack Deployment' },
    { id: 'dev-fullstack-06-testing', label: 'End-to-End Testing' },
    { id: 'dev-fullstack-07-performance', label: 'Full Stack Performance Optimization' },
    { id: 'dev-fullstack-zz-others', label: 'Others' }
  ],

  // Development - Mobile Development
  'dev-mobile': [
    { id: 'dev-mobile-01-ios', label: 'iOS Development' },
    { id: 'dev-mobile-02-android', label: 'Android Development' },
    { id: 'dev-mobile-03-cross-platform', label: 'Cross-Platform Development' },
    { id: 'dev-mobile-04-react-native', label: 'React Native Development' },
    { id: 'dev-mobile-05-flutter', label: 'Flutter Development' },
    { id: 'dev-mobile-06-pwa', label: 'Progressive Web Apps' },
    { id: 'dev-mobile-07-app-store', label: 'App Store Optimization' },
    { id: 'dev-mobile-zz-others', label: 'Others' }
  ],

  // Development - Security Development
  'dev-security': [
    { id: 'dev-security-01-auth', label: 'Authentication & Authorization' },
    { id: 'dev-security-02-encryption', label: 'Data Encryption Implementation' },
    { id: 'dev-security-03-vulnerability', label: 'Vulnerability Assessment' },
    { id: 'dev-security-04-penetration', label: 'Penetration Testing' },
    { id: 'dev-security-05-compliance', label: 'Security Compliance Implementation' },
    { id: 'dev-security-06-monitoring', label: 'Security Monitoring' },
    { id: 'dev-security-07-incident', label: 'Security Incident Response' },
    { id: 'dev-security-zz-others', label: 'Others' }
  ],

  // Development - Others
  'dev-zz-others': [
    { id: 'dev-other-01-prototyping', label: 'Rapid Prototyping' },
    { id: 'dev-other-02-research', label: 'Technology Research' },
    { id: 'dev-other-03-documentation', label: 'Technical Documentation' },
    { id: 'dev-other-04-mentoring', label: 'Technical Mentoring' },
    { id: 'dev-other-05-code-review', label: 'Code Review & Quality' },
    { id: 'dev-other-06-tooling', label: 'Developer Tooling' },
    { id: 'dev-other-07-integration', label: 'Third-party Integrations' },
    { id: 'dev-other-zz-others', label: 'Others' }
  ],

  // Design - Interaction Design
  'design-interaction': [
    { id: 'design-interaction-01-prototyping', label: 'Interactive Prototyping' },
    { id: 'design-interaction-02-micro-interactions', label: 'Micro-interactions Design' },
    { id: 'design-interaction-03-animation', label: 'Animation & Motion Design' },
    { id: 'design-interaction-04-transitions', label: 'UI Transitions' },
    { id: 'design-interaction-05-gestures', label: 'Gesture Design' },
    { id: 'design-interaction-06-voice-ui', label: 'Voice User Interface' },
    { id: 'design-interaction-07-accessibility', label: 'Accessible Interactions' },
    { id: 'design-interaction-zz-others', label: 'Others' }
  ],

  // Design - Product Design
  'design-product': [
    { id: 'design-product-01-strategy', label: 'Product Design Strategy' },
    { id: 'design-product-02-concept', label: 'Concept Development' },
    { id: 'design-product-03-user-flows', label: 'User Flow Design' },
    { id: 'design-product-04-feature-design', label: 'Feature Design' },
    { id: 'design-product-05-design-systems', label: 'Design System Creation' },
    { id: 'design-product-06-validation', label: 'Design Validation' },
    { id: 'design-product-07-iteration', label: 'Design Iteration' },
    { id: 'design-product-zz-others', label: 'Others' }
  ],

  // Design - Design Research
  'design-research': [
    { id: 'design-research-01-user-interviews', label: 'User Interviews' },
    { id: 'design-research-02-surveys', label: 'User Surveys' },
    { id: 'design-research-03-ethnography', label: 'Ethnographic Research' },
    { id: 'design-research-04-competitive', label: 'Competitive Research' },
    { id: 'design-research-05-analytics', label: 'Design Analytics' },
    { id: 'design-research-06-persona', label: 'Persona Development' },
    { id: 'design-research-07-journey-mapping', label: 'Customer Journey Mapping' },
    { id: 'design-research-zz-others', label: 'Others' }
  ],

  // Design - Design Systems
  'design-systems': [
    { id: 'design-systems-01-component-library', label: 'Component Library Development' },
    { id: 'design-systems-02-design-tokens', label: 'Design Tokens' },
    { id: 'design-systems-03-documentation', label: 'Design System Documentation' },
    { id: 'design-systems-04-governance', label: 'Design System Governance' },
    { id: 'design-systems-05-guidelines', label: 'Style Guidelines' },
    { id: 'design-systems-06-implementation', label: 'Design System Implementation' },
    { id: 'design-systems-07-maintenance', label: 'Design System Maintenance' },
    { id: 'design-systems-zz-others', label: 'Others' }
  ],

  // Design - UI Design
  'design-ui': [
    { id: 'design-ui-01-interface-design', label: 'User Interface Design' },
    { id: 'design-ui-02-layout', label: 'Layout & Grid Systems' },
    { id: 'design-ui-03-typography', label: 'Typography Design' },
    { id: 'design-ui-04-color', label: 'Color System Design' },
    { id: 'design-ui-05-iconography', label: 'Icon Design' },
    { id: 'design-ui-06-responsive', label: 'Responsive UI Design' },
    { id: 'design-ui-07-mobile-ui', label: 'Mobile UI Design' },
    { id: 'design-ui-zz-others', label: 'Others' }
  ],

  // Design - Visual Design
  'design-visual': [
    { id: 'design-visual-01-brand-identity', label: 'Brand Identity Design' },
    { id: 'design-visual-02-graphics', label: 'Graphic Design' },
    { id: 'design-visual-03-illustrations', label: 'Illustration Design' },
    { id: 'design-visual-04-photography', label: 'Photography & Image Editing' },
    { id: 'design-visual-05-video', label: 'Video & Motion Graphics' },
    { id: 'design-visual-06-print', label: 'Print Design' },
    { id: 'design-visual-07-marketing', label: 'Marketing Visual Design' },
    { id: 'design-visual-zz-others', label: 'Others' }
  ],

  // Design - Others
  'design-zz-others': [
    { id: 'design-other-01-consultation', label: 'Design Consultation' },
    { id: 'design-other-02-workshop', label: 'Design Workshops' },
    { id: 'design-other-03-mentoring', label: 'Design Mentoring' },
    { id: 'design-other-04-critique', label: 'Design Critique' },
    { id: 'design-other-05-presentation', label: 'Design Presentation' },
    { id: 'design-other-06-collaboration', label: 'Cross-functional Collaboration' },
    { id: 'design-other-07-strategy', label: 'Design Strategy' },
    { id: 'design-other-zz-others', label: 'Others' }
  ],

  // Product Management - Others
  'pm-zz-others': [
    { id: 'pm-other-01-stakeholder', label: 'Stakeholder Management' },
    { id: 'pm-other-02-communication', label: 'Product Communication' },
    { id: 'pm-other-03-training', label: 'Product Training' },
    { id: 'pm-other-04-support', label: 'Product Support' },
    { id: 'pm-other-05-feedback', label: 'Customer Feedback Management' },
    { id: 'pm-other-06-partnerships', label: 'Product Partnerships' },
    { id: 'pm-other-07-innovation', label: 'Product Innovation' },
    { id: 'pm-other-zz-others', label: 'Others' }
  ],

  // System Architecture - All categories
  'arch-cloud': [
    { id: 'arch-cloud-01-design', label: 'Cloud Architecture Design' },
    { id: 'arch-cloud-02-migration', label: 'Cloud Migration Strategy' },
    { id: 'arch-cloud-03-multi-cloud', label: 'Multi-Cloud Architecture' },
    { id: 'arch-cloud-04-serverless', label: 'Serverless Architecture' },
    { id: 'arch-cloud-05-security', label: 'Cloud Security Architecture' },
    { id: 'arch-cloud-06-cost-optimization', label: 'Cloud Cost Optimization' },
    { id: 'arch-cloud-07-monitoring', label: 'Cloud Monitoring Strategy' },
    { id: 'arch-cloud-zz-others', label: 'Others' }
  ],

  'arch-data': [
    { id: 'arch-data-01-modeling', label: 'Data Architecture Modeling' },
    { id: 'arch-data-02-governance', label: 'Data Governance' },
    { id: 'arch-data-03-warehousing', label: 'Data Warehouse Architecture' },
    { id: 'arch-data-04-lake', label: 'Data Lake Architecture' },
    { id: 'arch-data-05-streaming', label: 'Real-time Data Architecture' },
    { id: 'arch-data-06-integration', label: 'Data Integration Architecture' },
    { id: 'arch-data-07-security', label: 'Data Security Architecture' },
    { id: 'arch-data-zz-others', label: 'Others' }
  ],

  'arch-design': [
    { id: 'arch-design-01-system-design', label: 'High-Level System Design' },
    { id: 'arch-design-02-scalability', label: 'Scalability Architecture' },
    { id: 'arch-design-03-performance', label: 'Performance Architecture' },
    { id: 'arch-design-04-availability', label: 'High Availability Design' },
    { id: 'arch-design-05-disaster-recovery', label: 'Disaster Recovery Architecture' },
    { id: 'arch-design-06-capacity-planning', label: 'Capacity Planning' },
    { id: 'arch-design-07-documentation', label: 'Architecture Documentation' },
    { id: 'arch-design-zz-others', label: 'Others' }
  ],

  'arch-infrastructure': [
    { id: 'arch-infrastructure-01-network', label: 'Network Architecture' },
    { id: 'arch-infrastructure-02-storage', label: 'Storage Architecture' },
    { id: 'arch-infrastructure-03-compute', label: 'Compute Architecture' },
    { id: 'arch-infrastructure-04-virtualization', label: 'Virtualization Architecture' },
    { id: 'arch-infrastructure-05-container', label: 'Container Architecture' },
    { id: 'arch-infrastructure-06-monitoring', label: 'Infrastructure Monitoring' },
    { id: 'arch-infrastructure-07-automation', label: 'Infrastructure Automation' },
    { id: 'arch-infrastructure-zz-others', label: 'Others' }
  ],

  'arch-integration': [
    { id: 'arch-integration-01-api-gateway', label: 'API Gateway Architecture' },
    { id: 'arch-integration-02-messaging', label: 'Message Queue Architecture' },
    { id: 'arch-integration-03-event-driven', label: 'Event-Driven Architecture' },
    { id: 'arch-integration-04-service-mesh', label: 'Service Mesh Architecture' },
    { id: 'arch-integration-05-etl', label: 'ETL Architecture' },
    { id: 'arch-integration-06-real-time', label: 'Real-time Integration' },
    { id: 'arch-integration-07-batch', label: 'Batch Processing Architecture' },
    { id: 'arch-integration-zz-others', label: 'Others' }
  ],

  'arch-microservices': [
    { id: 'arch-microservices-01-design', label: 'Microservices Design' },
    { id: 'arch-microservices-02-decomposition', label: 'Service Decomposition' },
    { id: 'arch-microservices-03-communication', label: 'Service Communication' },
    { id: 'arch-microservices-04-data-management', label: 'Data Management Strategy' },
    { id: 'arch-microservices-05-deployment', label: 'Microservices Deployment' },
    { id: 'arch-microservices-06-monitoring', label: 'Distributed Monitoring' },
    { id: 'arch-microservices-07-governance', label: 'Service Governance' },
    { id: 'arch-microservices-zz-others', label: 'Others' }
  ],

  'arch-security': [
    { id: 'arch-security-01-framework', label: 'Security Framework Design' },
    { id: 'arch-security-02-identity', label: 'Identity & Access Management' },
    { id: 'arch-security-03-encryption', label: 'Encryption Architecture' },
    { id: 'arch-security-04-network', label: 'Network Security Architecture' },
    { id: 'arch-security-05-threat-modeling', label: 'Threat Modeling' },
    { id: 'arch-security-06-compliance', label: 'Compliance Architecture' },
    { id: 'arch-security-07-incident-response', label: 'Security Incident Response' },
    { id: 'arch-security-zz-others', label: 'Others' }
  ],

  'arch-zz-others': [
    { id: 'arch-other-01-assessment', label: 'Architecture Assessment' },
    { id: 'arch-other-02-governance', label: 'Architecture Governance' },
    { id: 'arch-other-03-consultation', label: 'Architecture Consultation' },
    { id: 'arch-other-04-review', label: 'Architecture Review' },
    { id: 'arch-other-05-standards', label: 'Architecture Standards' },
    { id: 'arch-other-06-training', label: 'Architecture Training' },
    { id: 'arch-other-07-tooling', label: 'Architecture Tooling' },
    { id: 'arch-other-zz-others', label: 'Others' }
  ],

  // Quality Assurance - All missing categories
  'qa-api': [
    { id: 'qa-api-01-functional', label: 'API Functional Testing' },
    { id: 'qa-api-02-integration', label: 'API Integration Testing' },
    { id: 'qa-api-03-performance', label: 'API Performance Testing' },
    { id: 'qa-api-04-security', label: 'API Security Testing' },
    { id: 'qa-api-05-contract', label: 'API Contract Testing' },
    { id: 'qa-api-06-documentation', label: 'API Documentation Testing' },
    { id: 'qa-api-07-automation', label: 'API Test Automation' },
    { id: 'qa-api-zz-others', label: 'Others' }
  ],

  'qa-automation': [
    { id: 'qa-automation-01-framework', label: 'Test Automation Framework' },
    { id: 'qa-automation-02-ui-automation', label: 'UI Test Automation' },
    { id: 'qa-automation-03-api-automation', label: 'API Test Automation' },
    { id: 'qa-automation-04-data-driven', label: 'Data-Driven Testing' },
    { id: 'qa-automation-05-ci-cd', label: 'CI/CD Test Integration' },
    { id: 'qa-automation-06-mobile-automation', label: 'Mobile Test Automation' },
    { id: 'qa-automation-07-maintenance', label: 'Test Automation Maintenance' },
    { id: 'qa-automation-zz-others', label: 'Others' }
  ],

  'qa-mobile': [
    { id: 'qa-mobile-01-functional', label: 'Mobile Functional Testing' },
    { id: 'qa-mobile-02-usability', label: 'Mobile Usability Testing' },
    { id: 'qa-mobile-03-performance', label: 'Mobile Performance Testing' },
    { id: 'qa-mobile-04-compatibility', label: 'Device Compatibility Testing' },
    { id: 'qa-mobile-05-security', label: 'Mobile Security Testing' },
    { id: 'qa-mobile-06-automation', label: 'Mobile Test Automation' },
    { id: 'qa-mobile-07-accessibility', label: 'Mobile Accessibility Testing' },
    { id: 'qa-mobile-zz-others', label: 'Others' }
  ],

  'qa-performance': [
    { id: 'qa-performance-01-load', label: 'Load Testing' },
    { id: 'qa-performance-02-stress', label: 'Stress Testing' },
    { id: 'qa-performance-03-scalability', label: 'Scalability Testing' },
    { id: 'qa-performance-04-volume', label: 'Volume Testing' },
    { id: 'qa-performance-05-endurance', label: 'Endurance Testing' },
    { id: 'qa-performance-06-monitoring', label: 'Performance Monitoring' },
    { id: 'qa-performance-07-optimization', label: 'Performance Optimization' },
    { id: 'qa-performance-zz-others', label: 'Others' }
  ],

  'qa-process': [
    { id: 'qa-process-01-strategy', label: 'QA Strategy Development' },
    { id: 'qa-process-02-planning', label: 'Test Planning' },
    { id: 'qa-process-03-documentation', label: 'QA Documentation' },
    { id: 'qa-process-04-metrics', label: 'QA Metrics & Reporting' },
    { id: 'qa-process-05-improvement', label: 'Process Improvement' },
    { id: 'qa-process-06-training', label: 'QA Team Training' },
    { id: 'qa-process-07-governance', label: 'QA Governance' },
    { id: 'qa-process-zz-others', label: 'Others' }
  ],

  'qa-security': [
    { id: 'qa-security-01-vulnerability', label: 'Vulnerability Testing' },
    { id: 'qa-security-02-penetration', label: 'Penetration Testing' },
    { id: 'qa-security-03-authentication', label: 'Authentication Testing' },
    { id: 'qa-security-04-authorization', label: 'Authorization Testing' },
    { id: 'qa-security-05-data-security', label: 'Data Security Testing' },
    { id: 'qa-security-06-compliance', label: 'Security Compliance Testing' },
    { id: 'qa-security-07-risk-assessment', label: 'Security Risk Assessment' },
    { id: 'qa-security-zz-others', label: 'Others' }
  ],

  'qa-zz-others': [
    { id: 'qa-other-01-consultation', label: 'QA Consultation' },
    { id: 'qa-other-02-audit', label: 'QA Audit' },
    { id: 'qa-other-03-tooling', label: 'QA Tooling & Setup' },
    { id: 'qa-other-04-review', label: 'QA Process Review' },
    { id: 'qa-other-05-mentoring', label: 'QA Team Mentoring' },
    { id: 'qa-other-06-research', label: 'QA Research & Innovation' },
    { id: 'qa-other-07-standards', label: 'QA Standards Development' },
    { id: 'qa-other-zz-others', label: 'Others' }
  ],

  // Project Management - All categories
  'proj-agile': [
    { id: 'proj-agile-01-scrum', label: 'Scrum Implementation' },
    { id: 'proj-agile-02-kanban', label: 'Kanban Implementation' },
    { id: 'proj-agile-03-coaching', label: 'Agile Coaching' },
    { id: 'proj-agile-04-transformation', label: 'Agile Transformation' },
    { id: 'proj-agile-05-ceremonies', label: 'Agile Ceremonies' },
    { id: 'proj-agile-06-metrics', label: 'Agile Metrics & Reporting' },
    { id: 'proj-agile-07-scaling', label: 'Scaling Agile Practices' },
    { id: 'proj-agile-zz-others', label: 'Others' }
  ],

  'proj-delivery': [
    { id: 'proj-delivery-01-planning', label: 'Delivery Planning' },
    { id: 'proj-delivery-02-execution', label: 'Delivery Execution' },
    { id: 'proj-delivery-03-monitoring', label: 'Delivery Monitoring' },
    { id: 'proj-delivery-04-quality', label: 'Delivery Quality Assurance' },
    { id: 'proj-delivery-05-release', label: 'Release Management' },
    { id: 'proj-delivery-06-post-delivery', label: 'Post-Delivery Support' },
    { id: 'proj-delivery-07-improvement', label: 'Delivery Process Improvement' },
    { id: 'proj-delivery-zz-others', label: 'Others' }
  ],

  'proj-execution': [
    { id: 'proj-execution-01-coordination', label: 'Project Coordination' },
    { id: 'proj-execution-02-monitoring', label: 'Progress Monitoring' },
    { id: 'proj-execution-03-control', label: 'Project Control' },
    { id: 'proj-execution-04-communication', label: 'Project Communication' },
    { id: 'proj-execution-05-issue-management', label: 'Issue Management' },
    { id: 'proj-execution-06-change-control', label: 'Change Control' },
    { id: 'proj-execution-07-closure', label: 'Project Closure' },
    { id: 'proj-execution-zz-others', label: 'Others' }
  ],

  'proj-planning': [
    { id: 'proj-planning-01-scope', label: 'Project Scope Definition' },
    { id: 'proj-planning-02-scheduling', label: 'Project Scheduling' },
    { id: 'proj-planning-03-budgeting', label: 'Project Budgeting' },
    { id: 'proj-planning-04-resource-allocation', label: 'Resource Allocation' },
    { id: 'proj-planning-05-risk-planning', label: 'Risk Planning' },
    { id: 'proj-planning-06-quality-planning', label: 'Quality Planning' },
    { id: 'proj-planning-07-communication-planning', label: 'Communication Planning' },
    { id: 'proj-planning-zz-others', label: 'Others' }
  ],

  'proj-resource': [
    { id: 'proj-resource-01-allocation', label: 'Resource Allocation' },
    { id: 'proj-resource-02-optimization', label: 'Resource Optimization' },
    { id: 'proj-resource-03-capacity-planning', label: 'Capacity Planning' },
    { id: 'proj-resource-04-skill-management', label: 'Skill Management' },
    { id: 'proj-resource-05-team-building', label: 'Team Building' },
    { id: 'proj-resource-06-vendor-management', label: 'Vendor Management' },
    { id: 'proj-resource-07-performance', label: 'Resource Performance Management' },
    { id: 'proj-resource-zz-others', label: 'Others' }
  ],

  'proj-risk': [
    { id: 'proj-risk-01-identification', label: 'Risk Identification' },
    { id: 'proj-risk-02-assessment', label: 'Risk Assessment' },
    { id: 'proj-risk-03-mitigation', label: 'Risk Mitigation' },
    { id: 'proj-risk-04-monitoring', label: 'Risk Monitoring' },
    { id: 'proj-risk-05-contingency', label: 'Contingency Planning' },
    { id: 'proj-risk-06-communication', label: 'Risk Communication' },
    { id: 'proj-risk-07-review', label: 'Risk Review & Update' },
    { id: 'proj-risk-zz-others', label: 'Others' }
  ],

  'proj-stakeholder': [
    { id: 'proj-stakeholder-01-identification', label: 'Stakeholder Identification' },
    { id: 'proj-stakeholder-02-analysis', label: 'Stakeholder Analysis' },
    { id: 'proj-stakeholder-03-engagement', label: 'Stakeholder Engagement' },
    { id: 'proj-stakeholder-04-communication', label: 'Stakeholder Communication' },
    { id: 'proj-stakeholder-05-expectation', label: 'Expectation Management' },
    { id: 'proj-stakeholder-06-relationship', label: 'Relationship Management' },
    { id: 'proj-stakeholder-07-feedback', label: 'Stakeholder Feedback Management' },
    { id: 'proj-stakeholder-zz-others', label: 'Others' }
  ],

  'proj-zz-others': [
    { id: 'proj-other-01-portfolio', label: 'Portfolio Management' },
    { id: 'proj-other-02-program', label: 'Program Management' },
    { id: 'proj-other-03-pmo', label: 'PMO Operations' },
    { id: 'proj-other-04-methodology', label: 'Project Methodology Development' },
    { id: 'proj-other-05-training', label: 'Project Management Training' },
    { id: 'proj-other-06-tooling', label: 'Project Management Tooling' },
    { id: 'proj-other-07-governance', label: 'Project Governance' },
    { id: 'proj-other-zz-others', label: 'Others' }
  ],

  // Executive - All missing categories
  'exec-finance': [
    { id: 'exec-finance-01-budgeting', label: 'Financial Budgeting & Planning' },
    { id: 'exec-finance-02-analysis', label: 'Financial Analysis' },
    { id: 'exec-finance-03-forecasting', label: 'Financial Forecasting' },
    { id: 'exec-finance-04-investment', label: 'Investment Strategy' },
    { id: 'exec-finance-05-cost-management', label: 'Cost Management' },
    { id: 'exec-finance-06-risk-management', label: 'Financial Risk Management' },
    { id: 'exec-finance-07-reporting', label: 'Financial Reporting' },
    { id: 'exec-finance-zz-others', label: 'Others' }
  ],

  'exec-governance': [
    { id: 'exec-governance-01-compliance', label: 'Regulatory Compliance' },
    { id: 'exec-governance-02-policy', label: 'Policy Development' },
    { id: 'exec-governance-03-audit', label: 'Internal Audit Management' },
    { id: 'exec-governance-04-ethics', label: 'Ethics & Conduct' },
    { id: 'exec-governance-05-board', label: 'Board Relations' },
    { id: 'exec-governance-06-legal', label: 'Legal Affairs Management' },
    { id: 'exec-governance-07-documentation', label: 'Governance Documentation' },
    { id: 'exec-governance-zz-others', label: 'Others' }
  ],

  'exec-innovation': [
    { id: 'exec-innovation-01-strategy', label: 'Innovation Strategy' },
    { id: 'exec-innovation-02-research', label: 'Innovation Research' },
    { id: 'exec-innovation-03-incubation', label: 'Innovation Incubation' },
    { id: 'exec-innovation-04-partnerships', label: 'Innovation Partnerships' },
    { id: 'exec-innovation-05-culture', label: 'Innovation Culture Development' },
    { id: 'exec-innovation-06-funding', label: 'Innovation Funding' },
    { id: 'exec-innovation-07-commercialization', label: 'Innovation Commercialization' },
    { id: 'exec-innovation-zz-others', label: 'Others' }
  ],

  'exec-leadership': [
    { id: 'exec-leadership-01-team-building', label: 'Executive Team Building' },
    { id: 'exec-leadership-02-coaching', label: 'Leadership Coaching' },
    { id: 'exec-leadership-03-succession', label: 'Succession Planning' },
    { id: 'exec-leadership-04-performance', label: 'Performance Management' },
    { id: 'exec-leadership-05-culture', label: 'Organizational Culture' },
    { id: 'exec-leadership-06-communication', label: 'Executive Communication' },
    { id: 'exec-leadership-07-development', label: 'Leadership Development' },
    { id: 'exec-leadership-zz-others', label: 'Others' }
  ],

  'exec-operations': [
    { id: 'exec-operations-01-optimization', label: 'Operations Optimization' },
    { id: 'exec-operations-02-process', label: 'Process Management' },
    { id: 'exec-operations-03-quality', label: 'Quality Management' },
    { id: 'exec-operations-04-supply-chain', label: 'Supply Chain Management' },
    { id: 'exec-operations-05-performance', label: 'Operational Performance' },
    { id: 'exec-operations-06-automation', label: 'Operations Automation' },
    { id: 'exec-operations-07-scalability', label: 'Operations Scalability' },
    { id: 'exec-operations-zz-others', label: 'Others' }
  ],

  'exec-transformation': [
    { id: 'exec-transformation-01-digital', label: 'Digital Transformation Strategy' },
    { id: 'exec-transformation-02-change-management', label: 'Organizational Change Management' },
    { id: 'exec-transformation-03-technology', label: 'Technology Transformation' },
    { id: 'exec-transformation-04-culture', label: 'Cultural Transformation' },
    { id: 'exec-transformation-05-process', label: 'Process Transformation' },
    { id: 'exec-transformation-06-business-model', label: 'Business Model Transformation' },
    { id: 'exec-transformation-07-measurement', label: 'Transformation Measurement' },
    { id: 'exec-transformation-zz-others', label: 'Others' }
  ],

  'exec-zz-others': [
    { id: 'exec-other-01-consulting', label: 'Executive Consulting' },
    { id: 'exec-other-02-advisory', label: 'Board Advisory' },
    { id: 'exec-other-03-mentoring', label: 'Executive Mentoring' },
    { id: 'exec-other-04-crisis', label: 'Crisis Management' },
    { id: 'exec-other-05-mergers', label: 'Mergers & Acquisitions' },
    { id: 'exec-other-06-investor-relations', label: 'Investor Relations' },
    { id: 'exec-other-07-public-relations', label: 'Public Relations' },
    { id: 'exec-other-zz-others', label: 'Others' }
  ],

  // Others - All missing categories
  'other-finance': [
    { id: 'other-finance-01-accounting', label: 'Accounting & Bookkeeping' },
    { id: 'other-finance-02-budgeting', label: 'Budget Management' },
    { id: 'other-finance-03-analysis', label: 'Financial Analysis' },
    { id: 'other-finance-04-planning', label: 'Financial Planning' },
    { id: 'other-finance-05-audit', label: 'Financial Audit' },
    { id: 'other-finance-06-tax', label: 'Tax Management' },
    { id: 'other-finance-07-investment', label: 'Investment Management' },
    { id: 'other-finance-zz-others', label: 'Others' }
  ],

  'other-hr': [
    { id: 'other-hr-01-recruitment', label: 'Recruitment & Hiring' },
    { id: 'other-hr-02-onboarding', label: 'Employee Onboarding' },
    { id: 'other-hr-03-performance', label: 'Performance Management' },
    { id: 'other-hr-04-training', label: 'Training & Development' },
    { id: 'other-hr-05-compensation', label: 'Compensation & Benefits' },
    { id: 'other-hr-06-employee-relations', label: 'Employee Relations' },
    { id: 'other-hr-07-compliance', label: 'HR Compliance' },
    { id: 'other-hr-zz-others', label: 'Others' }
  ],

  'other-legal': [
    { id: 'other-legal-01-contracts', label: 'Contract Management' },
    { id: 'other-legal-02-compliance', label: 'Legal Compliance' },
    { id: 'other-legal-03-intellectual-property', label: 'Intellectual Property' },
    { id: 'other-legal-04-litigation', label: 'Litigation Management' },
    { id: 'other-legal-05-regulatory', label: 'Regulatory Affairs' },
    { id: 'other-legal-06-privacy', label: 'Data Privacy & Protection' },
    { id: 'other-legal-07-corporate', label: 'Corporate Legal Affairs' },
    { id: 'other-legal-zz-others', label: 'Others' }
  ],

  'other-marketing': [
    { id: 'other-marketing-01-strategy', label: 'Marketing Strategy' },
    { id: 'other-marketing-02-digital', label: 'Digital Marketing' },
    { id: 'other-marketing-03-content', label: 'Content Marketing' },
    { id: 'other-marketing-04-campaigns', label: 'Marketing Campaigns' },
    { id: 'other-marketing-05-analytics', label: 'Marketing Analytics' },
    { id: 'other-marketing-06-branding', label: 'Brand Management' },
    { id: 'other-marketing-07-events', label: 'Event Marketing' },
    { id: 'other-marketing-zz-others', label: 'Others' }
  ],

  'other-po': [
    { id: 'other-po-01-lifecycle', label: 'Product Lifecycle Management' },
    { id: 'other-po-02-support', label: 'Product Support Operations' },
    { id: 'other-po-03-quality', label: 'Product Quality Assurance' },
    { id: 'other-po-04-compliance', label: 'Product Compliance' },
    { id: 'other-po-05-training', label: 'Product Training' },
    { id: 'other-po-06-documentation', label: 'Product Documentation' },
    { id: 'other-po-07-maintenance', label: 'Product Maintenance' },
    { id: 'other-po-zz-others', label: 'Others' }
  ],

  'other-sales': [
    { id: 'other-sales-01-strategy', label: 'Sales Strategy' },
    { id: 'other-sales-02-prospecting', label: 'Lead Generation & Prospecting' },
    { id: 'other-sales-03-relationship', label: 'Customer Relationship Management' },
    { id: 'other-sales-04-negotiation', label: 'Sales Negotiation' },
    { id: 'other-sales-05-closing', label: 'Deal Closing' },
    { id: 'other-sales-06-account-management', label: 'Account Management' },
    { id: 'other-sales-07-training', label: 'Sales Training' },
    { id: 'other-sales-zz-others', label: 'Others' }
  ],

  'other-zz-others': [
    { id: 'other-general-01-consulting', label: 'General Consulting' },
    { id: 'other-general-02-research', label: 'Research & Analysis' },
    { id: 'other-general-03-training', label: 'Training & Education' },
    { id: 'other-general-04-writing', label: 'Professional Writing' },
    { id: 'other-general-05-presentation', label: 'Presentation & Speaking' },
    { id: 'other-general-06-facilitation', label: 'Meeting Facilitation' },
    { id: 'other-general-07-coordination', label: 'Project Coordination' },
    { id: 'other-general-zz-others', label: 'Others' }
  ]
};

async function createMissingWorkTypes() {
  try {
    console.log('Creating missing work types...');
    
    let totalCreated = 0;
    
    for (const [categoryId, workTypes] of Object.entries(workTypesByCategory)) {
      console.log(`\\nProcessing category: ${categoryId}`);
      
      // Check if category exists
      const category = await prisma.workCategory.findUnique({
        where: { id: categoryId }
      });
      
      if (!category) {
        console.log(`  Category ${categoryId} not found, skipping...`);
        continue;
      }
      
      // Check existing work types
      const existingWorkTypes = await prisma.workType.findMany({
        where: { workCategoryId: categoryId }
      });
      
      const existingIds = new Set(existingWorkTypes.map(wt => wt.id));
      console.log(`  Existing work types: ${existingWorkTypes.length}`);
      
      // Create missing work types
      let createdInCategory = 0;
      for (const workType of workTypes) {
        if (!existingIds.has(workType.id)) {
          await prisma.workType.create({
            data: {
              id: workType.id,
              label: workType.label,
              workCategoryId: categoryId
            }
          });
          console.log(`  Created: ${workType.label}`);
          createdInCategory++;
          totalCreated++;
        }
      }
      
      console.log(`  Created ${createdInCategory} new work types in ${categoryId}`);
    }
    
    console.log(`\\n=== SUMMARY ===`);
    console.log(`Total work types created: ${totalCreated}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

createMissingWorkTypes();