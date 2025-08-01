const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Primary Focus Areas (Personas)
const primaryFocusAreas = [
  { id: 'development', label: 'Development', description: 'Writing code and implementing functionality' },
  { id: 'design', label: 'Design', description: 'Creating visual assets, wireframes, UI/UX work' },
  { id: 'product-management', label: 'Product Management', description: 'Product strategy, roadmapping, requirements' },
  { id: 'architecture', label: 'Architecture', description: 'System design and technical planning' },
  { id: 'quality-assurance', label: 'Quality Assurance', description: 'Testing, quality control, compliance' },
  { id: 'operations', label: 'Operations', description: 'System reliability, deployment, infrastructure' },
  { id: 'customer-success', label: 'Customer Success', description: 'Customer support, onboarding, training' },
  { id: 'project-management', label: 'Project Management', description: 'Project coordination, resource management' },
  { id: 'research', label: 'Research', description: 'Investigating solutions, technologies, or approaches' },
  { id: 'executive', label: 'Executive', description: 'Strategic leadership, organizational direction' },
  { id: 'marketing', label: 'Marketing', description: 'Marketing strategy, campaigns, content creation' },
  { id: 'sales', label: 'Sales', description: 'Sales processes, customer acquisition, revenue generation' },
  { id: 'finance', label: 'Finance', description: 'Financial planning, accounting, business analysis' },
  { id: 'hr', label: 'Human Resources', description: 'Talent management, employee relations, organizational development' },
  { id: 'legal-compliance', label: 'Legal & Compliance', description: 'Legal affairs, regulatory compliance, risk management' },
  { id: 'others', label: 'Others', description: 'Any work that doesn\'t fit into the categories above' },  
];

// Work categories organized by focus area
const workCategoriesData = {
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
    }
  ],
  'others': [
    { 
      id: 'others',
      label: 'Others',
      workTypes: [
        { id: 'others', label: 'Others (Please specify)' }
      ]
    }
  ]
};

// Skills data
const skillsData = [
  // Frontend Development
  { id: '1', name: 'React.js', category: 'Frontend' },
  { id: '2', name: 'Node.js', category: 'Backend' },
  { id: '3', name: 'API Design', category: 'Backend' },
  { id: '4', name: 'CSS/SCSS', category: 'Frontend' },
  { id: '5', name: 'TypeScript', category: 'Programming' },
  { id: '16', name: 'Angular', category: 'Frontend' },
  { id: '17', name: 'Vue.js', category: 'Frontend' },
  { id: '18', name: 'Next.js', category: 'Frontend' },
  { id: '19', name: 'Redux', category: 'Frontend' },
  { id: '20', name: 'Webpack', category: 'Build Tools' },
  { id: '21', name: 'HTML5', category: 'Frontend' },
  { id: '22', name: 'JavaScript', category: 'Programming' },
  { id: '23', name: 'GraphQL', category: 'API' },
  { id: '24', name: 'Responsive Web Design', category: 'Frontend' },
  { id: '25', name: 'Progressive Web Apps', category: 'Frontend' },
  { id: '26', name: 'Accessibility (a11y)', category: 'Frontend' },
  
  // Backend Development
  { id: '27', name: 'Express.js', category: 'Backend' },
  { id: '28', name: 'Python', category: 'Programming' },
  { id: '29', name: 'Django', category: 'Backend' },
  { id: '30', name: 'Flask', category: 'Backend' },
  { id: '31', name: 'Ruby on Rails', category: 'Backend' },
  { id: '32', name: 'PHP', category: 'Programming' },
  { id: '33', name: 'Java', category: 'Programming' },
  { id: '34', name: 'Spring Boot', category: 'Backend' },
  { id: '35', name: 'C#', category: 'Programming' },
  { id: '36', name: '.NET Core', category: 'Backend' },
  { id: '37', name: 'RESTful Services', category: 'API' },
  { id: '38', name: 'Microservices', category: 'Architecture' },
  
  // DevOps & Cloud
  { id: '6', name: 'AWS', category: 'Cloud' },
  { id: '7', name: 'Docker', category: 'DevOps' },
  { id: '8', name: 'Kubernetes', category: 'DevOps' },
  { id: '39', name: 'CI/CD', category: 'DevOps' },
  { id: '40', name: 'Azure', category: 'Cloud' },
  { id: '41', name: 'Google Cloud Platform', category: 'Cloud' },
  { id: '42', name: 'Terraform', category: 'Infrastructure' },
  { id: '43', name: 'Ansible', category: 'DevOps' },
  { id: '44', name: 'Jenkins', category: 'CI/CD' },
  { id: '45', name: 'GitLab CI', category: 'CI/CD' },
  { id: '46', name: 'GitHub Actions', category: 'CI/CD' },
  { id: '47', name: 'Prometheus', category: 'Monitoring' },
  { id: '48', name: 'Grafana', category: 'Monitoring' },
  
  // Database
  { id: '49', name: 'SQL', category: 'Database' },
  { id: '50', name: 'PostgreSQL', category: 'Database' },
  { id: '51', name: 'MySQL', category: 'Database' },
  { id: '52', name: 'MongoDB', category: 'Database' },
  { id: '53', name: 'Redis', category: 'Database' },
  { id: '54', name: 'ElasticSearch', category: 'Database' },
  { id: '55', name: 'DynamoDB', category: 'Database' },
  { id: '56', name: 'Cassandra', category: 'Database' },
  { id: '57', name: 'Database Design', category: 'Database' },
  { id: '58', name: 'ORM', category: 'Database' },
  
  // Design & UX
  { id: '9', name: 'UI Design', category: 'Design' },
  { id: '10', name: 'User Research', category: 'Design' },
  { id: '59', name: 'Figma', category: 'Design Tools' },
  { id: '60', name: 'Sketch', category: 'Design Tools' },
  { id: '61', name: 'Adobe XD', category: 'Design Tools' },
  { id: '62', name: 'Photoshop', category: 'Design Tools' },
  { id: '63', name: 'Illustrator', category: 'Design Tools' },
  { id: '64', name: 'Prototyping', category: 'Design' },
  { id: '65', name: 'Wireframing', category: 'Design' },
  { id: '66', name: 'Design Systems', category: 'Design' },
  { id: '67', name: 'Information Architecture', category: 'Design' },
  { id: '68', name: 'Interaction Design', category: 'Design' },
  { id: '69', name: 'UX Writing', category: 'Design' },
  { id: '70', name: 'Visual Design', category: 'Design' },
  
  // Product & Project Management
  { id: '11', name: 'Agile Methodologies', category: 'Project Management' },
  { id: '71', name: 'Scrum', category: 'Project Management' },
  { id: '72', name: 'Kanban', category: 'Project Management' },
  { id: '73', name: 'Jira', category: 'Tools' },
  { id: '74', name: 'Product Strategy', category: 'Product Management' },
  { id: '75', name: 'Roadmapping', category: 'Product Management' },
  { id: '76', name: 'User Stories', category: 'Product Management' },
  { id: '77', name: 'Feature Prioritization', category: 'Product Management' },
  { id: '78', name: 'Product Analytics', category: 'Analytics' },
  { id: '79', name: 'Stakeholder Management', category: 'Management' },
  { id: '80', name: 'Project Planning', category: 'Project Management' },
  { id: '81', name: 'Resource Allocation', category: 'Management' },
  
  // Quality & Testing
  { id: '13', name: 'Testing', category: 'Quality Assurance' },
  { id: '82', name: 'Jest', category: 'Testing Tools' },
  { id: '83', name: 'Cypress', category: 'Testing Tools' },
  { id: '84', name: 'Selenium', category: 'Testing Tools' },
  { id: '85', name: 'Test Planning', category: 'Quality Assurance' },
  { id: '86', name: 'Manual Testing', category: 'Quality Assurance' },
  { id: '87', name: 'Automated Testing', category: 'Quality Assurance' },
  { id: '88', name: 'QA Methodologies', category: 'Quality Assurance' },
  { id: '89', name: 'Test-Driven Development', category: 'Development' },
  { id: '90', name: 'Behavior-Driven Development', category: 'Development' },
  { id: '91', name: 'Regression Testing', category: 'Quality Assurance' },
  { id: '92', name: 'Performance Testing', category: 'Quality Assurance' },
  
  // Performance & Optimization
  { id: '14', name: 'Performance Optimization', category: 'Performance' },
  { id: '93', name: 'Web Performance', category: 'Performance' },
  { id: '94', name: 'Load Testing', category: 'Performance' },
  { id: '95', name: 'Caching Strategies', category: 'Performance' },
  { id: '96', name: 'Database Optimization', category: 'Database' },
  { id: '97', name: 'Memory Management', category: 'Performance' },
  { id: '98', name: 'Code Profiling', category: 'Performance' },
  { id: '99', name: 'Scalability', category: 'Architecture' },
  
  // Security
  { id: '15', name: 'Security', category: 'Security' },
  { id: '100', name: 'Authentication', category: 'Security' },
  { id: '101', name: 'Authorization', category: 'Security' },
  { id: '102', name: 'OAuth', category: 'Security' },
  { id: '103', name: 'JWT', category: 'Security' },
  { id: '104', name: 'OWASP', category: 'Security' },
  { id: '105', name: 'Penetration Testing', category: 'Security' },
  { id: '106', name: 'Secure Coding', category: 'Security' },
  { id: '107', name: 'Encryption', category: 'Security' },
  { id: '108', name: 'Security Auditing', category: 'Security' },
  
  // Documentation & Communication
  { id: '12', name: 'Technical Writing', category: 'Communication' },
  { id: '109', name: 'Documentation', category: 'Communication' },
  { id: '110', name: 'Knowledge Base', category: 'Communication' },
  { id: '111', name: 'API Documentation', category: 'Documentation' },
  { id: '112', name: 'Writing', category: 'Communication' },
  { id: '113', name: 'Communication', category: 'Soft Skills' },
  { id: '114', name: 'Presentation Skills', category: 'Communication' },
  
  // Mobile Development
  { id: '124', name: 'iOS Development', category: 'Mobile' },
  { id: '125', name: 'Android Development', category: 'Mobile' },
  { id: '126', name: 'React Native', category: 'Mobile' },
  { id: '127', name: 'Flutter', category: 'Mobile' },
  { id: '128', name: 'Swift', category: 'Programming' },
  { id: '129', name: 'Kotlin', category: 'Programming' },
  { id: '130', name: 'Mobile UI Design', category: 'Design' },
  { id: '131', name: 'Mobile Testing', category: 'Quality Assurance' },
  
  // Soft Skills
  { id: '132', name: 'Leadership', category: 'Soft Skills' },
  { id: '133', name: 'Teamwork', category: 'Soft Skills' },
  { id: '134', name: 'Problem Solving', category: 'Soft Skills' },
  { id: '135', name: 'Critical Thinking', category: 'Soft Skills' },
  { id: '136', name: 'Time Management', category: 'Soft Skills' },
  { id: '137', name: 'Adaptability', category: 'Soft Skills' },
  { id: '138', name: 'Creativity', category: 'Soft Skills' },
  { id: '139', name: 'Conflict Resolution', category: 'Soft Skills' },
  { id: '140', name: 'Mentoring', category: 'Soft Skills' },
];

// Work type to skills mapping (sample of key ones)
const workTypeToSkillsMapping = [
  // Frontend work types
  { workTypeId: 'ui-implementation', skillId: '1' }, // React
  { workTypeId: 'ui-implementation', skillId: '4' }, // CSS/SCSS
  { workTypeId: 'ui-implementation', skillId: '9' }, // UI Design
  { workTypeId: 'ui-implementation', skillId: '14' }, // Performance Optimization
  { workTypeId: 'ui-implementation', skillId: '21' }, // HTML5
  { workTypeId: 'ui-implementation', skillId: '22' }, // JavaScript
  { workTypeId: 'ui-implementation', skillId: '24' }, // Responsive Web Design
  { workTypeId: 'ui-implementation', skillId: '26' }, // Accessibility
  
  // Backend work types
  { workTypeId: 'api-development', skillId: '2' }, // Node.js
  { workTypeId: 'api-development', skillId: '3' }, // API Design
  { workTypeId: 'api-development', skillId: '5' }, // TypeScript
  { workTypeId: 'api-development', skillId: '23' }, // GraphQL
  { workTypeId: 'api-development', skillId: '27' }, // Express.js
  { workTypeId: 'api-development', skillId: '37' }, // RESTful Services
  { workTypeId: 'api-development', skillId: '49' }, // SQL
  
  // DevOps work types
  { workTypeId: 'ci-cd-pipeline', skillId: '6' }, // AWS
  { workTypeId: 'ci-cd-pipeline', skillId: '7' }, // Docker
  { workTypeId: 'ci-cd-pipeline', skillId: '8' }, // Kubernetes
  { workTypeId: 'ci-cd-pipeline', skillId: '39' }, // CI/CD
  { workTypeId: 'ci-cd-pipeline', skillId: '44' }, // Jenkins
  { workTypeId: 'ci-cd-pipeline', skillId: '45' }, // GitLab CI
  { workTypeId: 'ci-cd-pipeline', skillId: '46' }, // GitHub Actions
  
  // Design work types
  { workTypeId: 'ui-mockups', skillId: '9' }, // UI Design
  { workTypeId: 'ui-mockups', skillId: '59' }, // Figma
  { workTypeId: 'ui-mockups', skillId: '60' }, // Sketch
  { workTypeId: 'ui-mockups', skillId: '61' }, // Adobe XD
  { workTypeId: 'ui-mockups', skillId: '64' }, // Prototyping
  { workTypeId: 'ui-mockups', skillId: '70' }, // Visual Design
  
  // Testing work types
  { workTypeId: 'unit-testing', skillId: '13' }, // Testing
  { workTypeId: 'unit-testing', skillId: '82' }, // Jest
  { workTypeId: 'unit-testing', skillId: '85' }, // Test Planning
  { workTypeId: 'unit-testing', skillId: '89' }, // Test-Driven Development
  
  // Performance work types
  { workTypeId: 'performance-optimization', skillId: '14' }, // Performance Optimization
  { workTypeId: 'performance-optimization', skillId: '93' }, // Web Performance
  { workTypeId: 'performance-optimization', skillId: '94' }, // Load Testing
  { workTypeId: 'performance-optimization', skillId: '95' }, // Caching Strategies
  { workTypeId: 'performance-optimization', skillId: '96' }, // Database Optimization
  { workTypeId: 'performance-optimization', skillId: '99' }, // Scalability
];

async function main() {
  console.log('🌱 Starting seed process...');

  try {
    // Clear existing reference data (be careful not to clear existing skills)
    console.log('🧹 Clearing existing reference data...');
    
    // Try to clear each table, but continue if they don't exist
    try {
      await prisma.workTypeSkill.deleteMany();
      console.log('   - Cleared WorkTypeSkill table');
    } catch (error) {
      console.log('   - WorkTypeSkill table not found or already empty');
    }
    
    try {
      await prisma.workType.deleteMany();
      console.log('   - Cleared WorkType table');
    } catch (error) {
      console.log('   - WorkType table not found or already empty');
    }
    
    try {
      await prisma.workCategory.deleteMany();
      console.log('   - Cleared WorkCategory table');
    } catch (error) {
      console.log('   - WorkCategory table not found or already empty');
    }
    
    try {
      await prisma.focusArea.deleteMany();
      console.log('   - Cleared FocusArea table');
    } catch (error) {
      console.log('   - FocusArea table not found or already empty');
    }

    // Seed Focus Areas
    console.log('📋 Seeding focus areas...');
    for (const focusArea of primaryFocusAreas) {
      await prisma.focusArea.create({
        data: focusArea
      });
    }

    // Seed Skills (use upsert to avoid conflicts with existing skills)
    console.log('🎯 Seeding skills...');
    for (const skill of skillsData) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: {
          name: skill.name,
          category: skill.category
        },
        create: {
          id: skill.id,
          name: skill.name,
          category: skill.category
        }
      });
    }

    // Seed Work Categories and Work Types
    console.log('🏗️ Seeding work categories and types...');
    for (const [focusAreaId, categories] of Object.entries(workCategoriesData)) {
      for (const category of categories) {
        // Create work category
        await prisma.workCategory.create({
          data: {
            id: category.id,
            label: category.label,
            focusAreaId: focusAreaId
          }
        });

        // Create work types for this category
        for (const workType of category.workTypes) {
          await prisma.workType.create({
            data: {
              id: workType.id,
              label: workType.label,
              workCategoryId: category.id
            }
          });
        }
      }
    }

    // Seed Work Type to Skills mapping
    console.log('🔗 Seeding work type to skills mapping...');
    for (const mapping of workTypeToSkillsMapping) {
      try {
        await prisma.workTypeSkill.create({
          data: {
            workTypeId: mapping.workTypeId,
            skillId: mapping.skillId
          }
        });
      } catch (error) {
        console.log(`⚠️ Warning: Could not create mapping for workType ${mapping.workTypeId} -> skill ${mapping.skillId}`);
      }
    }

    console.log('✅ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Focus Areas: ${primaryFocusAreas.length}`);
    console.log(`   - Skills: ${skillsData.length}`);
    console.log(`   - Work Type-Skill Mappings: ${workTypeToSkillsMapping.length}`);
    
    // Count work categories and types
    let totalCategories = 0;
    let totalWorkTypes = 0;
    for (const categories of Object.values(workCategoriesData)) {
      totalCategories += categories.length;
      for (const category of categories) {
        totalWorkTypes += category.workTypes.length;
      }
    }
    console.log(`   - Work Categories: ${totalCategories}`);
    console.log(`   - Work Types: ${totalWorkTypes}`);

  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });