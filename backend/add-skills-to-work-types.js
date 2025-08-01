const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define skills for each work type category
const workTypeSkillsMapping = {
  // Development - Frontend
  'dev-frontend-01-ui-implementation': [
    'HTML/CSS', 'JavaScript', 'React.js', 'Vue.js', 'Angular', 'TypeScript', 'UI/UX Design', 'Responsive Design'
  ],
  'dev-frontend-02-component-development': [
    'React.js', 'Vue.js', 'Angular', 'TypeScript', 'Component Libraries', 'State Management', 'API Integration', 'Reusable Components'
  ],
  'dev-frontend-03-responsive-design': [
    'Responsive Design', 'Mobile-First Design', 'CSS Grid', 'Flexbox', 'Media Queries', 'Cross-browser Compatibility', 'HTML/CSS', 'Web Standards'
  ],
  'dev-frontend-04-state-management': [
    'State Management', 'Redux', 'MobX', 'Context API', 'Vuex', 'NgRx', 'Application State', 'Data Flow'
  ],
  'dev-frontend-05-performance-optimization': [
    'Performance Optimization', 'Web Performance', 'Code Splitting', 'Lazy Loading', 'Bundle Optimization', 'Core Web Vitals', 'JavaScript', 'CSS Optimization'
  ],
  'dev-frontend-06-testing': [
    'Unit Testing', 'Integration Testing', 'End-to-End Testing', 'Jest', 'Cypress', 'React Testing Library', 'Test Automation', 'QA Testing'
  ],
  'dev-frontend-07-accessibility': [
    'Web Accessibility', 'WCAG Guidelines', 'Screen Reader Testing', 'Keyboard Navigation', 'HTML/CSS', 'JavaScript', 'Accessibility Testing', 'Inclusive Design'
  ],
  'dev-frontend-08-pwa-development': [
    'Progressive Web Apps', 'Service Workers', 'Web App Manifest', 'Offline Functionality', 'Push Notifications', 'App Shell', 'Web APIs', 'Mobile Web'
  ],
  'dev-frontend-99-others': [
    'JavaScript', 'HTML/CSS', 'React.js', 'Vue.js', 'TypeScript', 'Web Development', 'Frontend Development', 'UI Development'
  ],

  // Development - Backend
  'dev-backend-01-api-development': [
    'API Development', 'REST APIs', 'GraphQL', 'Node.js', 'Python', 'Java', 'Database Design', 'API Documentation'
  ],
  'dev-backend-02-database-design': [
    'Database Design', 'SQL', 'PostgreSQL', 'MongoDB', 'Data Modeling', 'Database Optimization', 'NoSQL', 'Database Administration'
  ],
  'dev-backend-03-authentication': [
    'Authentication Systems', 'JWT', 'OAuth', 'Security', 'Session Management', 'User Management', 'Authorization', 'Identity Management'
  ],
  'dev-backend-04-microservices': [
    'Microservices Architecture', 'Docker', 'Kubernetes', 'Service Mesh', 'API Gateway', 'Distributed Systems', 'Cloud Architecture', 'Container Orchestration'
  ],
  'dev-backend-05-integration': [
    'System Integration', 'API Integration', 'Third-party APIs', 'Data Integration', 'ETL Processes', 'Message Queues', 'Event-driven Architecture', 'Integration Patterns'
  ],
  'dev-backend-06-performance': [
    'Performance Optimization', 'Database Optimization', 'Caching', 'Load Balancing', 'Code Optimization', 'Scalability', 'Performance Monitoring', 'Bottleneck Analysis'
  ],
  'dev-backend-07-security': [
    'Security Implementation', 'Application Security', 'Data Security', 'Encryption', 'Vulnerability Assessment', 'Security Testing', 'OWASP', 'Penetration Testing'
  ],
  'dev-backend-08-monitoring': [
    'Monitoring & Logging', 'Application Monitoring', 'Performance Monitoring', 'Log Analysis', 'Alerting', 'Observability', 'Debugging', 'System Monitoring'
  ],
  'dev-backend-zz-others': [
    'Backend Development', 'Server-side Development', 'API Development', 'Database Management', 'System Architecture', 'Cloud Computing', 'DevOps', 'Programming'
  ],

  // Development - DevOps
  'dev-devops-01-ci-cd': [
    'CI/CD', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Build Automation', 'Deployment Automation', 'DevOps', 'Pipeline Management'
  ],
  'dev-devops-02-containerization': [
    'Docker', 'Kubernetes', 'Container Orchestration', 'Containerization', 'Microservices', 'Cloud Native', 'Pod Management', 'Service Discovery'
  ],
  'dev-devops-03-infrastructure': [
    'Infrastructure as Code', 'Terraform', 'AWS CloudFormation', 'Ansible', 'Cloud Infrastructure', 'Infrastructure Management', 'Automation', 'Configuration Management'
  ],
  'dev-devops-04-cloud-deployment': [
    'Cloud Deployment', 'AWS', 'Azure', 'Google Cloud', 'Cloud Architecture', 'Serverless', 'Cloud Migration', 'Cloud Security'
  ],
  'dev-devops-05-monitoring': [
    'System Monitoring', 'Application Monitoring', 'Prometheus', 'Grafana', 'ELK Stack', 'Observability', 'Performance Monitoring', 'Alerting'
  ],
  'dev-devops-06-security': [
    'DevSecOps', 'Security Automation', 'Vulnerability Scanning', 'Compliance', 'Security Testing', 'Infrastructure Security', 'Container Security', 'Cloud Security'
  ],
  'dev-devops-07-automation': [
    'Automation', 'Scripting', 'Infrastructure Automation', 'Process Automation', 'Workflow Automation', 'Configuration Management', 'Orchestration', 'Tool Integration'
  ],
  'dev-devops-zz-others': [
    'DevOps', 'System Administration', 'Cloud Computing', 'Infrastructure Management', 'Automation', 'Deployment', 'Operations', 'Site Reliability Engineering'
  ],

  // Design - UX
  'design-ux-01-user-research': [
    'User Research', 'User Interviews', 'User Testing', 'Research Methods', 'Data Analysis', 'Behavioral Analysis', 'Market Research', 'User Insights'
  ],
  'design-ux-02-personas': [
    'User Personas', 'User Research', 'Customer Segmentation', 'User Journey Mapping', 'Behavioral Analysis', 'Market Research', 'User Insights', 'Persona Development'
  ],
  'design-ux-03-journey-mapping': [
    'User Journey Mapping', 'Customer Journey', 'Experience Mapping', 'Touchpoint Analysis', 'User Flow', 'Process Mapping', 'Service Design', 'User Experience'
  ],
  'design-ux-04-wireframing': [
    'Wireframing', 'Prototyping', 'User Interface Design', 'Information Architecture', 'Design Tools', 'User Experience', 'Interaction Design', 'Design Systems'
  ],
  'design-ux-05-usability-testing': [
    'Usability Testing', 'User Testing', 'A/B Testing', 'User Research', 'Test Planning', 'User Feedback', 'Heuristic Evaluation', 'Accessibility Testing'
  ],
  'design-ux-06-information-architecture': [
    'Information Architecture', 'Content Strategy', 'Site Mapping', 'Navigation Design', 'Content Organization', 'User Flow', 'Taxonomy', 'Information Design'
  ],
  'design-ux-07-interaction-design': [
    'Interaction Design', 'User Interface Design', 'Micro-interactions', 'Animation', 'Prototyping', 'User Experience', 'Design Systems', 'Usability'
  ],
  'design-ux-08-design-systems': [
    'Design Systems', 'Component Libraries', 'Style Guides', 'Design Tokens', 'UI Components', 'Design Consistency', 'Brand Guidelines', 'Design Documentation'
  ],
  'design-ux-zz-others': [
    'User Experience Design', 'UX Design', 'User Research', 'Design Thinking', 'Human-Computer Interaction', 'Usability', 'User Interface Design', 'Design Strategy'
  ],

  // Design - Visual
  'design-visual-01-brand-identity': [
    'Brand Identity', 'Logo Design', 'Brand Guidelines', 'Visual Identity', 'Brand Strategy', 'Typography', 'Color Theory', 'Brand Development'
  ],
  'design-visual-02-graphics': [
    'Graphic Design', 'Visual Design', 'Adobe Creative Suite', 'Illustration', 'Typography', 'Layout Design', 'Print Design', 'Digital Design'
  ],
  'design-visual-03-ui-design': [
    'UI Design', 'User Interface Design', 'Visual Design', 'Design Systems', 'Prototyping', 'Interaction Design', 'Web Design', 'Mobile Design'
  ],
  'design-visual-04-illustrations': [
    'Illustration', 'Digital Art', 'Vector Graphics', 'Adobe Illustrator', 'Graphic Design', 'Visual Storytelling', 'Icon Design', 'Creative Design'
  ],
  'design-visual-05-photography': [
    'Photography', 'Photo Editing', 'Adobe Photoshop', 'Visual Content', 'Image Composition', 'Lighting', 'Digital Photography', 'Brand Photography'
  ],
  'design-visual-06-video': [
    'Video Production', 'Video Editing', 'Motion Graphics', 'Animation', 'Adobe After Effects', 'Video Content', 'Storytelling', 'Creative Direction'
  ],
  'design-visual-07-print': [
    'Print Design', 'Layout Design', 'Typography', 'Adobe InDesign', 'Brochure Design', 'Publishing', 'Graphic Design', 'Print Production'
  ],
  'design-visual-zz-others': [
    'Visual Design', 'Creative Design', 'Graphic Design', 'Adobe Creative Suite', 'Design Tools', 'Visual Communication', 'Creative Direction', 'Art Direction'
  ],

  // Product Management
  'pm-analysis-01-market-research': [
    'Market Research', 'Competitive Analysis', 'Customer Research', 'Data Analysis', 'Market Intelligence', 'Industry Analysis', 'Consumer Insights', 'Research Methods'
  ],
  'pm-analysis-02-user-analytics': [
    'User Analytics', 'Data Analysis', 'Google Analytics', 'Product Analytics', 'User Behavior Analysis', 'KPI Tracking', 'A/B Testing', 'Performance Metrics'
  ],
  'pm-analysis-03-competitive-analysis': [
    'Competitive Analysis', 'Market Intelligence', 'Competitor Research', 'SWOT Analysis', 'Market Positioning', 'Benchmarking', 'Strategic Analysis', 'Industry Knowledge'
  ],
  'pm-analysis-04-product-metrics': [
    'Product Metrics', 'KPI Tracking', 'Data Analysis', 'Performance Measurement', 'Analytics', 'Product Analytics', 'Metrics Dashboard', 'Business Intelligence'
  ],
  'pm-analysis-05-customer-feedback': [
    'Customer Feedback', 'User Research', 'Survey Design', 'Feedback Analysis', 'Customer Insights', 'Voice of Customer', 'User Interviews', 'Customer Support'
  ],
  'pm-analysis-06-ab-testing': [
    'A/B Testing', 'Experimentation', 'Statistical Analysis', 'Test Design', 'Data-driven Decisions', 'Hypothesis Testing', 'Conversion Optimization', 'Performance Testing'
  ],
  'pm-analysis-07-roi-analysis': [
    'ROI Analysis', 'Financial Analysis', 'Business Case Development', 'Cost-Benefit Analysis', 'Investment Analysis', 'Financial Modeling', 'Budget Planning', 'Business Metrics'
  ],
  'pm-analysis-zz-others': [
    'Product Analysis', 'Data Analysis', 'Market Research', 'Business Analysis', 'Strategic Analysis', 'Product Intelligence', 'Decision Making', 'Analytical Thinking'
  ],

  // Product Management - Documentation
  'pm-documentation-01-requirements': [
    'Requirements Documentation', 'Technical Writing', 'Product Requirements', 'Business Requirements', 'Functional Specifications', 'User Stories', 'Documentation', 'Requirements Analysis'
  ],
  'pm-documentation-02-user-stories': [
    'User Stories', 'Acceptance Criteria', 'Agile Methodology', 'Story Writing', 'Requirements Gathering', 'User-Centered Design', 'Product Requirements', 'Scrum'
  ],
  'pm-documentation-03-api-specs': [
    'API Documentation', 'Technical Specifications', 'API Design', 'OpenAPI', 'Swagger', 'Technical Writing', 'Developer Documentation', 'Integration Documentation'
  ],
  'pm-documentation-04-feature-specs': [
    'Feature Specifications', 'Product Specifications', 'Technical Requirements', 'Feature Documentation', 'Product Design', 'Requirements Documentation', 'Technical Writing', 'Product Development'
  ],
  'pm-documentation-05-user-guides': [
    'User Documentation', 'Help Documentation', 'User Guides', 'Technical Writing', 'Knowledge Base', 'User Experience', 'Documentation Design', 'Customer Support'
  ],
  'pm-documentation-06-release-notes': [
    'Release Notes', 'Change Management', 'Version Control', 'Product Communication', 'Feature Communication', 'Technical Writing', 'Product Updates', 'Customer Communication'
  ],
  'pm-documentation-07-process-docs': [
    'Process Documentation', 'Workflow Documentation', 'Standard Operating Procedures', 'Process Design', 'Documentation Management', 'Knowledge Management', 'Process Improvement', 'Technical Writing'
  ],
  'pm-documentation-zz-others': [
    'Documentation', 'Technical Writing', 'Product Documentation', 'Knowledge Management', 'Information Architecture', 'Content Strategy', 'Communication', 'Process Documentation'
  ],

  // Product Management - Strategy
  'pm-strategy-01-roadmap': [
    'Product Roadmap', 'Strategic Planning', 'Product Strategy', 'Feature Prioritization', 'Release Planning', 'Product Vision', 'Stakeholder Management', 'Strategic Thinking'
  ],
  'pm-strategy-02-feature-prioritization': [
    'Feature Prioritization', 'Product Prioritization', 'Decision Making', 'Strategic Planning', 'Resource Allocation', 'Product Strategy', 'Roadmap Planning', 'Stakeholder Management'
  ],
  'pm-strategy-03-go-to-market': [
    'Go-to-Market Strategy', 'Product Launch', 'Market Entry', 'Product Marketing', 'Launch Planning', 'Market Strategy', 'Customer Acquisition', 'Sales Strategy'
  ],
  'pm-strategy-04-product-vision': [
    'Product Vision', 'Strategic Vision', 'Product Strategy', 'Vision Communication', 'Strategic Planning', 'Product Leadership', 'Innovation Strategy', 'Future Planning'
  ],
  'pm-strategy-05-market-positioning': [
    'Market Positioning', 'Competitive Positioning', 'Brand Positioning', 'Product Positioning', 'Market Strategy', 'Differentiation Strategy', 'Value Proposition', 'Marketing Strategy'
  ],
  'pm-strategy-06-pricing': [
    'Pricing Strategy', 'Revenue Strategy', 'Competitive Pricing', 'Value-based Pricing', 'Price Optimization', 'Financial Analysis', 'Market Analysis', 'Business Model'
  ],
  'pm-strategy-07-partnerships': [
    'Strategic Partnerships', 'Business Development', 'Partnership Strategy', 'Ecosystem Development', 'Alliance Management', 'Collaboration', 'Channel Strategy', 'Integration Strategy'
  ],
  'pm-strategy-zz-others': [
    'Product Strategy', 'Strategic Planning', 'Business Strategy', 'Product Management', 'Strategic Thinking', 'Vision & Strategy', 'Market Strategy', 'Innovation Strategy'
  ],

  // Add more work type categories...
  // System Architecture
  'sysarch-design-01-system-design': [
    'System Design', 'Architecture Design', 'Software Architecture', 'System Architecture', 'Design Patterns', 'Scalability', 'Performance', 'Technical Leadership'
  ],
  'sysarch-design-02-scalability': [
    'Scalability', 'Performance Optimization', 'System Design', 'Load Balancing', 'Distributed Systems', 'Architecture Planning', 'Capacity Planning', 'High Availability'
  ],
  'sysarch-design-03-microservices': [
    'Microservices Architecture', 'Service Design', 'API Design', 'Distributed Systems', 'Container Architecture', 'Service Mesh', 'Event-driven Architecture', 'System Integration'
  ],
  'sysarch-design-04-database': [
    'Database Architecture', 'Database Design', 'Data Architecture', 'SQL', 'NoSQL', 'Database Optimization', 'Data Modeling', 'Database Performance'
  ],
  'sysarch-design-05-security': [
    'Security Architecture', 'System Security', 'Security Design', 'Threat Modeling', 'Security Patterns', 'Authentication', 'Authorization', 'Data Protection'
  ],
  'sysarch-design-06-integration': [
    'System Integration', 'API Integration', 'Integration Architecture', 'Enterprise Integration', 'Message Queues', 'Event-driven Architecture', 'Integration Patterns', 'Middleware'
  ],
  'sysarch-design-07-cloud': [
    'Cloud Architecture', 'Cloud Design', 'AWS', 'Azure', 'Google Cloud', 'Cloud Migration', 'Cloud Security', 'Serverless Architecture'
  ],
  'sysarch-design-zz-others': [
    'System Architecture', 'Software Architecture', 'Technical Architecture', 'Solution Architecture', 'Enterprise Architecture', 'Architecture Design', 'System Design', 'Technical Leadership'
  ],

  // Quality Assurance
  'qa-testing-01-test-planning': [
    'Test Planning', 'Test Strategy', 'Test Design', 'QA Planning', 'Test Management', 'Quality Assurance', 'Testing Methodology', 'Test Documentation'
  ],
  'qa-testing-02-automated-testing': [
    'Test Automation', 'Automated Testing', 'Selenium', 'Test Frameworks', 'CI/CD Testing', 'API Testing', 'Regression Testing', 'Test Scripts'
  ],
  'qa-testing-03-manual-testing': [
    'Manual Testing', 'Exploratory Testing', 'User Acceptance Testing', 'Functional Testing', 'Test Execution', 'Bug Detection', 'Quality Assurance', 'Test Cases'
  ],
  'qa-testing-04-performance': [
    'Performance Testing', 'Load Testing', 'Stress Testing', 'Performance Analysis', 'Scalability Testing', 'Performance Optimization', 'Bottleneck Analysis', 'Capacity Testing'
  ],
  'qa-testing-05-security': [
    'Security Testing', 'Penetration Testing', 'Vulnerability Testing', 'Security Analysis', 'OWASP', 'Security Audit', 'Risk Assessment', 'Compliance Testing'
  ],
  'qa-testing-06-api-testing': [
    'API Testing', 'REST API Testing', 'GraphQL Testing', 'Integration Testing', 'Postman', 'API Automation', 'Contract Testing', 'Service Testing'
  ],
  'qa-testing-07-mobile-testing': [
    'Mobile Testing', 'iOS Testing', 'Android Testing', 'Mobile Automation', 'Cross-platform Testing', 'Device Testing', 'App Testing', 'Mobile Performance'
  ],
  'qa-testing-zz-others': [
    'Quality Assurance', 'Software Testing', 'Test Management', 'Bug Tracking', 'Test Strategy', 'Quality Control', 'Testing Tools', 'QA Processes'
  ],

  // Project Management
  'proj-planning-01-project-planning': [
    'Project Planning', 'Project Management', 'Planning & Scheduling', 'Resource Planning', 'Timeline Management', 'Scope Management', 'Risk Management', 'Budget Planning'
  ],
  'proj-planning-02-agile': [
    'Agile Methodology', 'Scrum', 'Kanban', 'Sprint Planning', 'Agile Planning', 'Backlog Management', 'Agile Coaching', 'Iterative Development'
  ],
  'proj-planning-03-waterfall': [
    'Waterfall Methodology', 'Traditional Project Management', 'Phase-gate Management', 'Sequential Development', 'Project Documentation', 'Milestone Management', 'Requirements Management', 'Change Control'
  ],
  'proj-planning-04-risk-management': [
    'Risk Management', 'Risk Assessment', 'Risk Mitigation', 'Risk Analysis', 'Contingency Planning', 'Issue Management', 'Problem Solving', 'Crisis Management'
  ],
  'proj-planning-05-stakeholder': [
    'Stakeholder Management', 'Stakeholder Communication', 'Stakeholder Engagement', 'Relationship Management', 'Communication Management', 'Expectation Management', 'Influence Management', 'Conflict Resolution'
  ],
  'proj-planning-06-budget': [
    'Budget Management', 'Cost Management', 'Financial Planning', 'Budget Tracking', 'Cost Control', 'Resource Allocation', 'Financial Analysis', 'Expense Management'
  ],
  'proj-planning-07-resource': [
    'Resource Management', 'Resource Planning', 'Team Management', 'Capacity Planning', 'Resource Allocation', 'Workforce Planning', 'Skill Management', 'Resource Optimization'
  ],
  'proj-planning-zz-others': [
    'Project Management', 'Program Management', 'Portfolio Management', 'Project Leadership', 'Team Leadership', 'Project Delivery', 'Operations Management', 'Change Management'
  ],

  // Executive
  'exec-leadership-01-strategic-planning': [
    'Strategic Planning', 'Business Strategy', 'Strategic Vision', 'Long-term Planning', 'Strategic Thinking', 'Vision Setting', 'Strategy Execution', 'Business Planning'
  ],
  'exec-leadership-02-team-leadership': [
    'Team Leadership', 'People Management', 'Leadership Development', 'Team Building', 'Performance Management', 'Coaching & Mentoring', 'Talent Management', 'Organizational Leadership'
  ],
  'exec-leadership-03-decision-making': [
    'Decision Making', 'Strategic Decision Making', 'Critical Thinking', 'Problem Solving', 'Analytical Thinking', 'Risk Assessment', 'Executive Judgment', 'Data-driven Decisions'
  ],
  'exec-leadership-04-change-management': [
    'Change Management', 'Organizational Change', 'Change Leadership', 'Transformation', 'Culture Change', 'Change Communication', 'Stakeholder Buy-in', 'Change Strategy'
  ],
  'exec-leadership-05-business-development': [
    'Business Development', 'Growth Strategy', 'Market Expansion', 'Partnership Development', 'Revenue Growth', 'New Market Entry', 'Strategic Partnerships', 'Business Growth'
  ],
  'exec-leadership-06-financial-oversight': [
    'Financial Management', 'Financial Oversight', 'Budget Management', 'Financial Planning', 'P&L Management', 'Financial Analysis', 'Investment Decisions', 'Cost Management'
  ],
  'exec-leadership-07-stakeholder': [
    'Stakeholder Management', 'Board Relations', 'Investor Relations', 'Executive Communication', 'Stakeholder Engagement', 'Relationship Management', 'Public Relations', 'Corporate Governance'
  ],
  'exec-leadership-zz-others': [
    'Executive Leadership', 'Senior Leadership', 'Strategic Leadership', 'C-Suite Leadership', 'Corporate Leadership', 'Business Leadership', 'Organizational Leadership', 'Management'
  ]
};

async function addSkillsToWorkTypes() {
  try {
    console.log('Starting to add skills to work types...');
    
    // Get all existing skills to avoid duplicates
    const existingSkills = await prisma.skill.findMany();
    const skillMap = new Map();
    existingSkills.forEach(skill => {
      skillMap.set(skill.name.toLowerCase(), skill);
    });
    
    console.log('Found', existingSkills.length, 'existing skills');
    
    let totalSkillsAdded = 0;
    let totalMappingsAdded = 0;
    
    for (const [workTypeId, skillNames] of Object.entries(workTypeSkillsMapping)) {
      console.log(`Processing work type: ${workTypeId}`);
      
      // Check if work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: workTypeId },
        include: { workTypeSkills: true }
      });
      
      if (!workType) {
        console.log(`  Work type ${workTypeId} not found, skipping...`);
        continue;
      }
      
      // Get existing skill mappings for this work type
      const existingMappings = new Set(workType.workTypeSkills.map(wts => wts.skillId));
      
      for (const skillName of skillNames) {
        // Check if skill exists, if not create it
        let skill = skillMap.get(skillName.toLowerCase());
        if (!skill) {
          // Generate a unique ID for the skill
          const skillId = skillName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const uniqueSkillId = `skill-${skillId}`;
          
          skill = await prisma.skill.create({
            data: {
              id: uniqueSkillId,
              name: skillName,
              category: 'technical' // Default category
            }
          });
          skillMap.set(skillName.toLowerCase(), skill);
          totalSkillsAdded++;
          console.log(`  Created new skill: ${skillName} (ID: ${uniqueSkillId})`);
        }
        
        // Check if mapping already exists
        if (!existingMappings.has(skill.id)) {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: workTypeId,
              skillId: skill.id
            }
          });
          totalMappingsAdded++;
          console.log(`  Added mapping: ${workTypeId} -> ${skillName}`);
        }
      }
    }
    
    console.log('\\n=== SUMMARY ===');
    console.log('Total new skills created:', totalSkillsAdded);
    console.log('Total skill mappings added:', totalMappingsAdded);
    console.log('Work types processed:', Object.keys(workTypeSkillsMapping).length);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

addSkillsToWorkTypes();