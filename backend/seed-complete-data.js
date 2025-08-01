const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // First, add focus areas
  const focusAreas = [
    { id: '01-development', label: 'Development', description: 'Software and application development' },
    { id: '02-design', label: 'Design', description: 'User experience and visual design' },
    { id: '03-product-management', label: 'Product Management', description: 'Product strategy and management' },
    { id: '04-system-architecture', label: 'System Architecture', description: 'System design and architecture' },
    { id: '05-quality-assurance', label: 'Quality Assurance', description: 'Testing and quality control' },
    { id: '06-project-management', label: 'Project Management', description: 'Project planning and execution' },
    { id: '07-executive', label: 'Executive', description: 'Leadership and strategic planning' },
    { id: '99-others', label: 'Others', description: 'Other professional areas' }
  ];

  console.log('Adding focus areas...');
  for (const focusArea of focusAreas) {
    await prisma.focusArea.upsert({
      where: { id: focusArea.id },
      update: focusArea,
      create: focusArea
    });
  }

  // Add work categories
  const workCategories = [
    // Development categories
    { id: 'dev-frontend', label: 'Frontend Development', focusAreaId: '01-development' },
    { id: 'dev-backend', label: 'Backend Development', focusAreaId: '01-development' },
    { id: 'dev-fullstack', label: 'Full Stack Development', focusAreaId: '01-development' },
    { id: 'dev-mobile', label: 'Mobile Development', focusAreaId: '01-development' },
    { id: 'dev-devops', label: 'DevOps & Infrastructure', focusAreaId: '01-development' },
    { id: 'dev-data', label: 'Data Engineering', focusAreaId: '01-development' },
    { id: 'dev-security', label: 'Security Development', focusAreaId: '01-development' },
    { id: 'dev-99-others', label: 'Others', focusAreaId: '01-development' },

    // Design categories
    { id: 'design-ux', label: 'UX Design', focusAreaId: '02-design' },
    { id: 'design-ui', label: 'UI Design', focusAreaId: '02-design' },
    { id: 'design-visual', label: 'Visual Design', focusAreaId: '02-design' },
    { id: 'design-product', label: 'Product Design', focusAreaId: '02-design' },
    { id: 'design-interaction', label: 'Interaction Design', focusAreaId: '02-design' },
    { id: 'design-research', label: 'Design Research', focusAreaId: '02-design' },
    { id: 'design-systems', label: 'Design Systems', focusAreaId: '02-design' },
    { id: 'design-99-others', label: 'Others', focusAreaId: '02-design' },

    // Product Management categories
    { id: 'pm-strategy', label: 'Product Strategy', focusAreaId: '03-product-management' },
    { id: 'pm-planning', label: 'Product Planning', focusAreaId: '03-product-management' },
    { id: 'pm-analysis', label: 'Product Analysis', focusAreaId: '03-product-management' },
    { id: 'pm-marketing', label: 'Product Marketing', focusAreaId: '03-product-management' },
    { id: 'pm-operations', label: 'Product Operations', focusAreaId: '03-product-management' },
    { id: 'pm-growth', label: 'Product Growth', focusAreaId: '03-product-management' },
    { id: 'pm-launch', label: 'Product Launch', focusAreaId: '03-product-management' },
    { id: 'pm-99-others', label: 'Others', focusAreaId: '03-product-management' },

    // System Architecture categories
    { id: 'arch-design', label: 'System Design', focusAreaId: '04-system-architecture' },
    { id: 'arch-infrastructure', label: 'Infrastructure Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-cloud', label: 'Cloud Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-microservices', label: 'Microservices Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-data', label: 'Data Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-security', label: 'Security Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-integration', label: 'Integration Architecture', focusAreaId: '04-system-architecture' },
    { id: 'arch-99-others', label: 'Others', focusAreaId: '04-system-architecture' },

    // Quality Assurance categories
    { id: 'qa-manual', label: 'Manual Testing', focusAreaId: '05-quality-assurance' },
    { id: 'qa-automation', label: 'Test Automation', focusAreaId: '05-quality-assurance' },
    { id: 'qa-performance', label: 'Performance Testing', focusAreaId: '05-quality-assurance' },
    { id: 'qa-security', label: 'Security Testing', focusAreaId: '05-quality-assurance' },
    { id: 'qa-mobile', label: 'Mobile Testing', focusAreaId: '05-quality-assurance' },
    { id: 'qa-api', label: 'API Testing', focusAreaId: '05-quality-assurance' },
    { id: 'qa-process', label: 'QA Process & Strategy', focusAreaId: '05-quality-assurance' },
    { id: 'qa-99-others', label: 'Others', focusAreaId: '05-quality-assurance' },

    // Project Management categories
    { id: 'proj-planning', label: 'Project Planning', focusAreaId: '06-project-management' },
    { id: 'proj-execution', label: 'Project Execution', focusAreaId: '06-project-management' },
    { id: 'proj-agile', label: 'Agile Management', focusAreaId: '06-project-management' },
    { id: 'proj-risk', label: 'Risk Management', focusAreaId: '06-project-management' },
    { id: 'proj-resource', label: 'Resource Management', focusAreaId: '06-project-management' },
    { id: 'proj-stakeholder', label: 'Stakeholder Management', focusAreaId: '06-project-management' },
    { id: 'proj-delivery', label: 'Project Delivery', focusAreaId: '06-project-management' },
    { id: 'proj-99-others', label: 'Others', focusAreaId: '06-project-management' },

    // Executive categories
    { id: 'exec-strategy', label: 'Strategic Planning', focusAreaId: '07-executive' },
    { id: 'exec-leadership', label: 'Leadership & Management', focusAreaId: '07-executive' },
    { id: 'exec-operations', label: 'Operations Management', focusAreaId: '07-executive' },
    { id: 'exec-finance', label: 'Financial Management', focusAreaId: '07-executive' },
    { id: 'exec-transformation', label: 'Digital Transformation', focusAreaId: '07-executive' },
    { id: 'exec-governance', label: 'Governance & Compliance', focusAreaId: '07-executive' },
    { id: 'exec-innovation', label: 'Innovation Management', focusAreaId: '07-executive' },
    { id: 'exec-99-others', label: 'Others', focusAreaId: '07-executive' },

    // Others categories
    { id: 'other-cs', label: 'Customer Service', focusAreaId: '99-others' },
    { id: 'other-po', label: 'Product Operations', focusAreaId: '99-others' },
    { id: 'other-finance', label: 'Finance', focusAreaId: '99-others' },
    { id: 'other-hr', label: 'Human Resource Management', focusAreaId: '99-others' },
    { id: 'other-marketing', label: 'Marketing', focusAreaId: '99-others' },
    { id: 'other-sales', label: 'Sales', focusAreaId: '99-others' },
    { id: 'other-legal', label: 'Legal and Compliance', focusAreaId: '99-others' },
    { id: 'other-99-others', label: 'Others', focusAreaId: '99-others' }
  ];

  console.log('Adding work categories...');
  for (const workCategory of workCategories) {
    await prisma.workCategory.upsert({
      where: { id: workCategory.id },
      update: workCategory,
      create: workCategory
    });
  }

  // Add sample work types for key categories
  const workTypes = [
    // Frontend Development work types
    { id: 'dev-frontend-01-ui-implementation', label: 'UI Implementation', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-02-component-development', label: 'Component Development', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-03-responsive-design', label: 'Responsive Design', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-04-state-management', label: 'State Management', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-05-performance-optimization', label: 'Performance Optimization', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-06-testing', label: 'Frontend Testing', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-07-accessibility', label: 'Accessibility Implementation', workCategoryId: 'dev-frontend' },
    { id: 'dev-frontend-99-others', label: 'Others', workCategoryId: 'dev-frontend' },

    // Backend Development work types
    { id: 'dev-backend-01-api-development', label: 'API Development', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-02-database-design', label: 'Database Design', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-03-authentication', label: 'Authentication Systems', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-04-microservices', label: 'Microservices Development', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-05-integration', label: 'System Integration', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-06-performance', label: 'Performance Optimization', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-07-security', label: 'Security Implementation', workCategoryId: 'dev-backend' },
    { id: 'dev-backend-99-others', label: 'Others', workCategoryId: 'dev-backend' },

    // UX Design work types
    { id: 'design-ux-01-research', label: 'User Research & Analysis', workCategoryId: 'design-ux' },
    { id: 'design-ux-02-personas', label: 'User Personas Development', workCategoryId: 'design-ux' },
    { id: 'design-ux-03-journey-mapping', label: 'User Journey Mapping', workCategoryId: 'design-ux' },
    { id: 'design-ux-04-wireframing', label: 'Wireframing & Prototyping', workCategoryId: 'design-ux' },
    { id: 'design-ux-05-usability-testing', label: 'Usability Testing', workCategoryId: 'design-ux' },
    { id: 'design-ux-06-information-architecture', label: 'Information Architecture', workCategoryId: 'design-ux' },
    { id: 'design-ux-07-interaction-design', label: 'Interaction Design', workCategoryId: 'design-ux' },
    { id: 'design-ux-99-others', label: 'Others', workCategoryId: 'design-ux' },

    // Product Strategy work types
    { id: 'pm-strategy-01-vision', label: 'Product Vision Development', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-02-positioning', label: 'Product Positioning', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-03-roadmap', label: 'Product Roadmap Planning', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-04-market-analysis', label: 'Market Analysis', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-05-competitive-analysis', label: 'Competitive Analysis', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-06-go-to-market', label: 'Go-to-Market Strategy', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-07-metrics', label: 'Product Metrics & KPIs', workCategoryId: 'pm-strategy' },
    { id: 'pm-strategy-99-others', label: 'Others', workCategoryId: 'pm-strategy' },

    // Quality Assurance work types
    { id: 'qa-manual-01-functional', label: 'Functional Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-02-exploratory', label: 'Exploratory Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-03-regression', label: 'Regression Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-04-user-acceptance', label: 'User Acceptance Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-05-integration', label: 'Integration Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-06-compatibility', label: 'Compatibility Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-07-accessibility', label: 'Accessibility Testing', workCategoryId: 'qa-manual' },
    { id: 'qa-manual-99-others', label: 'Others', workCategoryId: 'qa-manual' },

    // Executive work types
    { id: 'exec-strategy-01-vision', label: 'Vision Development', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-02-planning', label: 'Strategic Planning', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-03-transformation', label: 'Digital Transformation', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-04-innovation', label: 'Innovation Strategy', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-05-partnerships', label: 'Strategic Partnerships', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-06-market-expansion', label: 'Market Expansion', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-07-risk-management', label: 'Strategic Risk Management', workCategoryId: 'exec-strategy' },
    { id: 'exec-strategy-99-others', label: 'Others', workCategoryId: 'exec-strategy' },

    // Others work types
    { id: 'other-cs-01-support', label: 'Customer Support', workCategoryId: 'other-cs' },
    { id: 'other-cs-02-success', label: 'Customer Success', workCategoryId: 'other-cs' },
    { id: 'other-cs-03-onboarding', label: 'Customer Onboarding', workCategoryId: 'other-cs' },
    { id: 'other-cs-04-retention', label: 'Customer Retention', workCategoryId: 'other-cs' },
    { id: 'other-cs-05-feedback', label: 'Customer Feedback Management', workCategoryId: 'other-cs' },
    { id: 'other-cs-06-training', label: 'Customer Training', workCategoryId: 'other-cs' },
    { id: 'other-cs-07-advocacy', label: 'Customer Advocacy', workCategoryId: 'other-cs' },
    { id: 'other-cs-99-others', label: 'Others', workCategoryId: 'other-cs' }
  ];

  console.log('Adding work types...');
  for (const workType of workTypes) {
    await prisma.workType.upsert({
      where: { id: workType.id },
      update: workType,
      create: workType
    });
  }

  // Add comprehensive skills
  const skills = [
    // Frontend Technologies
    { id: 'skill-react', name: 'React.js', category: 'Frontend' },
    { id: 'skill-vue', name: 'Vue.js', category: 'Frontend' },
    { id: 'skill-angular', name: 'Angular', category: 'Frontend' },
    { id: 'skill-javascript', name: 'JavaScript', category: 'Frontend' },
    { id: 'skill-typescript', name: 'TypeScript', category: 'Frontend' },
    { id: 'skill-html-css', name: 'HTML/CSS', category: 'Frontend' },
    { id: 'skill-sass', name: 'SASS/SCSS', category: 'Frontend' },
    { id: 'skill-tailwind', name: 'Tailwind CSS', category: 'Frontend' },
    { id: 'skill-bootstrap', name: 'Bootstrap', category: 'Frontend' },
    { id: 'skill-webpack', name: 'Webpack', category: 'Frontend' },
    { id: 'skill-vite', name: 'Vite', category: 'Frontend' },
    { id: 'skill-jest', name: 'Jest Testing', category: 'Frontend' },
    { id: 'skill-cypress', name: 'Cypress Testing', category: 'Frontend' },
    { id: 'skill-responsive-design', name: 'Responsive Design', category: 'Frontend' },
    { id: 'skill-accessibility', name: 'Web Accessibility (WCAG)', category: 'Frontend' },
    { id: 'skill-pwa', name: 'Progressive Web Apps', category: 'Frontend' },

    // Backend Technologies
    { id: 'skill-nodejs', name: 'Node.js', category: 'Backend' },
    { id: 'skill-python', name: 'Python', category: 'Backend' },
    { id: 'skill-java', name: 'Java', category: 'Backend' },
    { id: 'skill-csharp', name: 'C#', category: 'Backend' },
    { id: 'skill-go', name: 'Go', category: 'Backend' },
    { id: 'skill-rust', name: 'Rust', category: 'Backend' },
    { id: 'skill-php', name: 'PHP', category: 'Backend' },
    { id: 'skill-ruby', name: 'Ruby', category: 'Backend' },
    { id: 'skill-express', name: 'Express.js', category: 'Backend' },
    { id: 'skill-django', name: 'Django', category: 'Backend' },
    { id: 'skill-flask', name: 'Flask', category: 'Backend' },
    { id: 'skill-spring', name: 'Spring Framework', category: 'Backend' },
    { id: 'skill-dotnet', name: '.NET Core', category: 'Backend' },
    { id: 'skill-rest-api', name: 'REST API Design', category: 'Backend' },
    { id: 'skill-graphql', name: 'GraphQL', category: 'Backend' },
    { id: 'skill-grpc', name: 'gRPC', category: 'Backend' },

    // Database Technologies
    { id: 'skill-postgresql', name: 'PostgreSQL', category: 'Database' },
    { id: 'skill-mysql', name: 'MySQL', category: 'Database' },
    { id: 'skill-mongodb', name: 'MongoDB', category: 'Database' },
    { id: 'skill-redis', name: 'Redis', category: 'Database' },
    { id: 'skill-elasticsearch', name: 'Elasticsearch', category: 'Database' },
    { id: 'skill-sql', name: 'SQL', category: 'Database' },
    { id: 'skill-database-design', name: 'Database Design', category: 'Database' },
    { id: 'skill-orm', name: 'ORM/ODM', category: 'Database' },

    // Design Skills
    { id: 'skill-figma', name: 'Figma', category: 'Design' },
    { id: 'skill-sketch', name: 'Sketch', category: 'Design' },
    { id: 'skill-adobe-xd', name: 'Adobe XD', category: 'Design' },
    { id: 'skill-photoshop', name: 'Adobe Photoshop', category: 'Design' },
    { id: 'skill-illustrator', name: 'Adobe Illustrator', category: 'Design' },
    { id: 'skill-ux-research', name: 'UX Research', category: 'Design' },
    { id: 'skill-user-testing', name: 'User Testing', category: 'Design' },
    { id: 'skill-wireframing', name: 'Wireframing', category: 'Design' },
    { id: 'skill-prototyping', name: 'Prototyping', category: 'Design' },
    { id: 'skill-design-systems', name: 'Design Systems', category: 'Design' },
    { id: 'skill-visual-design', name: 'Visual Design', category: 'Design' },
    { id: 'skill-interaction-design', name: 'Interaction Design', category: 'Design' },
    { id: 'skill-information-architecture', name: 'Information Architecture', category: 'Design' },
    { id: 'skill-usability-testing', name: 'Usability Testing', category: 'Design' },
    { id: 'skill-design-thinking', name: 'Design Thinking', category: 'Design' },
    { id: 'skill-branding', name: 'Brand Design', category: 'Design' },

    // Product Management Skills
    { id: 'skill-product-strategy', name: 'Product Strategy', category: 'Product' },
    { id: 'skill-roadmap-planning', name: 'Roadmap Planning', category: 'Product' },
    { id: 'skill-market-research', name: 'Market Research', category: 'Product' },
    { id: 'skill-competitive-analysis', name: 'Competitive Analysis', category: 'Product' },
    { id: 'skill-user-stories', name: 'User Story Writing', category: 'Product' },
    { id: 'skill-product-analytics', name: 'Product Analytics', category: 'Product' },
    { id: 'skill-a-b-testing', name: 'A/B Testing', category: 'Product' },
    { id: 'skill-go-to-market', name: 'Go-to-Market Strategy', category: 'Product' },
    { id: 'skill-stakeholder-management', name: 'Stakeholder Management', category: 'Product' },
    { id: 'skill-product-discovery', name: 'Product Discovery', category: 'Product' },
    { id: 'skill-customer-research', name: 'Customer Research', category: 'Product' },
    { id: 'skill-product-metrics', name: 'Product Metrics & KPIs', category: 'Product' },

    // Testing & QA
    { id: 'skill-test-automation', name: 'Test Automation', category: 'Testing' },
    { id: 'skill-selenium', name: 'Selenium', category: 'Testing' },
    { id: 'skill-playwright', name: 'Playwright', category: 'Testing' },
    { id: 'skill-postman', name: 'Postman/API Testing', category: 'Testing' },
    { id: 'skill-performance-testing', name: 'Performance Testing', category: 'Testing' },
    { id: 'skill-load-testing', name: 'Load Testing', category: 'Testing' },
    { id: 'skill-manual-testing', name: 'Manual Testing', category: 'Testing' },
    { id: 'skill-test-planning', name: 'Test Planning & Strategy', category: 'Testing' },

    // Leadership & Executive Skills
    { id: 'skill-strategic-planning', name: 'Strategic Planning', category: 'Leadership' },
    { id: 'skill-team-leadership', name: 'Team Leadership', category: 'Leadership' },
    { id: 'skill-change-management', name: 'Change Management', category: 'Leadership' },
    { id: 'skill-executive-communication', name: 'Executive Communication', category: 'Leadership' },
    { id: 'skill-business-strategy', name: 'Business Strategy', category: 'Leadership' },
    { id: 'skill-financial-planning', name: 'Financial Planning', category: 'Leadership' },
    { id: 'skill-operations-management', name: 'Operations Management', category: 'Leadership' },
    { id: 'skill-digital-transformation', name: 'Digital Transformation', category: 'Leadership' },

    // Other Professional Skills
    { id: 'skill-customer-service', name: 'Customer Service', category: 'Customer Support' },
    { id: 'skill-sales', name: 'Sales Techniques', category: 'Sales' },
    { id: 'skill-marketing', name: 'Digital Marketing', category: 'Marketing' },
    { id: 'skill-content-creation', name: 'Content Creation', category: 'Marketing' },
    { id: 'skill-crm', name: 'CRM Systems', category: 'Sales' },
    { id: 'skill-data-analysis', name: 'Data Analysis', category: 'Analytics' },
    { id: 'skill-excel', name: 'Advanced Excel', category: 'Analytics' },

    // Soft Skills
    { id: 'skill-communication', name: 'Communication Skills', category: 'Soft Skills' },
    { id: 'skill-problem-solving', name: 'Problem Solving', category: 'Soft Skills' },
    { id: 'skill-critical-thinking', name: 'Critical Thinking', category: 'Soft Skills' },
    { id: 'skill-time-management', name: 'Time Management', category: 'Soft Skills' },
    { id: 'skill-collaboration', name: 'Collaboration', category: 'Soft Skills' },
    { id: 'skill-mentoring', name: 'Mentoring & Coaching', category: 'Soft Skills' },
    { id: 'skill-presentation', name: 'Presentation Skills', category: 'Soft Skills' },
    { id: 'skill-documentation', name: 'Technical Documentation', category: 'Communication' },

    // System Architecture Skills
    { id: 'skill-system-design', name: 'System Design', category: 'Architecture' },
    { id: 'skill-microservices', name: 'Microservices Architecture', category: 'Architecture' },
    { id: 'skill-api-design', name: 'API Design', category: 'Architecture' },
    { id: 'skill-scalability', name: 'Scalability Design', category: 'Architecture' },
    { id: 'skill-caching', name: 'Caching Strategies', category: 'Architecture' },
    { id: 'skill-distributed-systems', name: 'Distributed Systems', category: 'Architecture' },

    // Version Control
    { id: 'skill-git', name: 'Git Version Control', category: 'Development' },
    { id: 'skill-github', name: 'GitHub', category: 'Development' },

    // Project Management
    { id: 'skill-agile', name: 'Agile Methodology', category: 'Project Management' },
    { id: 'skill-scrum', name: 'Scrum Framework', category: 'Project Management' },
    { id: 'skill-kanban', name: 'Kanban', category: 'Project Management' },
    { id: 'skill-jira', name: 'Jira', category: 'Project Management' },
    { id: 'skill-project-planning', name: 'Project Planning', category: 'Project Management' },
    { id: 'skill-risk-management', name: 'Risk Management', category: 'Project Management' }
  ];

  console.log('Adding skills...');
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: skill,
      create: skill
    });
  }

  // Add work type to skill mappings
  const skillMappings = [
    // Frontend Development > UI Implementation
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-react' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-html-css' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-javascript' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-sass' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-responsive-design' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-figma' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-visual-design' },
    { workTypeId: 'dev-frontend-01-ui-implementation', skillId: 'skill-accessibility' },

    // Frontend Development > Component Development
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-react' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-vue' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-angular' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-typescript' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-design-systems' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-jest' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-documentation' },
    { workTypeId: 'dev-frontend-02-component-development', skillId: 'skill-git' },

    // Backend Development > API Development
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-rest-api' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-graphql' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-nodejs' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-python' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-java' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-api-design' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-postman' },
    { workTypeId: 'dev-backend-01-api-development', skillId: 'skill-documentation' },

    // Design > UX > User Research
    { workTypeId: 'design-ux-01-research', skillId: 'skill-ux-research' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-user-testing' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-customer-research' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-market-research' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-data-analysis' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-competitive-analysis' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-design-thinking' },
    { workTypeId: 'design-ux-01-research', skillId: 'skill-excel' },

    // Product Management > Strategy > Product Vision
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-product-strategy' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-market-research' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-competitive-analysis' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-strategic-planning' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-stakeholder-management' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-business-strategy' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-communication' },
    { workTypeId: 'pm-strategy-01-vision', skillId: 'skill-presentation' },

    // Quality Assurance > Manual Testing > Functional Testing
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-manual-testing' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-test-planning' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-documentation' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-critical-thinking' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-problem-solving' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-communication' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-time-management' },
    { workTypeId: 'qa-manual-01-functional', skillId: 'skill-jira' },

    // Executive > Strategic Planning > Vision Development
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-strategic-planning' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-business-strategy' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-market-research' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-competitive-analysis' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-financial-planning' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-stakeholder-management' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-executive-communication' },
    { workTypeId: 'exec-strategy-01-vision', skillId: 'skill-change-management' },

    // Others > Customer Service > Customer Support
    { workTypeId: 'other-cs-01-support', skillId: 'skill-customer-service' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-communication' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-problem-solving' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-crm' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-time-management' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-collaboration' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-documentation' },
    { workTypeId: 'other-cs-01-support', skillId: 'skill-critical-thinking' }
  ];

  console.log('Adding skill mappings...');
  for (const mapping of skillMappings) {
    await prisma.workTypeSkill.upsert({
      where: {
        workTypeId_skillId: {
          workTypeId: mapping.workTypeId,
          skillId: mapping.skillId
        }
      },
      update: {},
      create: mapping
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });