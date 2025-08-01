const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleEntries() {
  try {
    // Get the user and workspace
    const user = await prisma.user.findUnique({
      where: { email: 'sarah.chen@techcorp.com' }
    });

    const workspace = await prisma.workspace.findFirst({
      where: { 
        members: {
          some: {
            userId: user.id
          }
        }
      }
    });

    if (!user || !workspace) {
      console.log('User or workspace not found');
      return;
    }

    // Sample journal entries
    const entries = [
      {
        title: 'E-commerce Platform Performance Optimization',
        description: 'Led performance optimization efforts for a high-traffic web application, resulting in 40% faster load times and improved user engagement.',
        fullContent: `# E-commerce Platform Performance Optimization

## Overview
Led a comprehensive performance optimization initiative for our main e-commerce platform, focusing on both frontend and backend improvements.

## Key Achievements
- Reduced page load times by 40%
- Improved Core Web Vitals scores
- Enhanced user engagement metrics
- Implemented advanced caching strategies

## Technical Implementation
- Optimized database queries using indexing
- Implemented Redis caching layer  
- Minified and compressed frontend assets
- Lazy loading for images and components

## Impact
- 25% increase in conversion rates
- 15% reduction in bounce rate
- Improved customer satisfaction scores`,
        abstractContent: 'Led performance optimization efforts for a high-traffic web application, resulting in 40% faster load times and improved user engagement.',
        visibility: 'network',
        isPublished: true,
        category: 'Development',
        tags: ['performance', 'optimization', 'e-commerce'],
        skills: ['React.js', 'Node.js', 'Performance Optimization', 'Database Design', 'Caching']
      },
      {
        title: 'React Component Library Development',
        description: 'Built a comprehensive design system and component library used across 5 different products, improving development efficiency by 30%.',
        fullContent: `# React Component Library Development

## Project Overview
Developed a comprehensive design system and reusable component library to standardize UI components across multiple products.

## Key Components Built
- Form components with validation
- Data visualization components
- Navigation and layout components
- Interactive elements and overlays

## Technical Stack
- React with TypeScript
- Styled Components
- Storybook for documentation
- Jest for testing
- NPM for distribution

## Impact
- 30% faster development time
- Consistent user experience
- Reduced design debt
- Improved maintainability`,
        abstractContent: 'Built a comprehensive design system and component library used across 5 different products, improving development efficiency by 30%.',
        visibility: 'workspace',
        isPublished: false,
        category: 'Development',
        tags: ['react', 'component-library', 'design-system'],
        skills: ['React.js', 'TypeScript', 'Design Systems', 'Component Development']
      },
      {
        title: 'API Architecture Redesign',
        description: 'Redesigned microservices architecture to improve scalability and reduce latency by 50%. Implemented proper authentication and authorization.',
        fullContent: `# API Architecture Redesign

## Challenge
Legacy monolithic API was becoming difficult to maintain and scale, causing performance bottlenecks.

## Solution
Designed and implemented a microservices architecture with the following improvements:

### Architecture Changes
- Separated concerns into domain-specific services
- Implemented API Gateway for routing
- Added service mesh for communication
- Integrated monitoring and logging

### Performance Improvements
- 50% reduction in average response time
- Better horizontal scaling capabilities
- Improved fault tolerance
- Enhanced security measures

## Technologies Used
- Node.js with Express
- Docker containers
- Kubernetes orchestration
- Redis for caching
- PostgreSQL for data persistence

## Results
- Improved system reliability
- Better developer experience
- Easier deployment and maintenance
- Enhanced monitoring capabilities`,
        abstractContent: 'Redesigned microservices architecture to improve scalability and reduce latency by 50%. Implemented proper authentication and authorization.',
        visibility: 'network',
        isPublished: true,
        category: 'Architecture',
        tags: ['microservices', 'api', 'architecture'],
        skills: ['System Design', 'API Design', 'Microservices', 'Node.js', 'Docker']
      },
      {
        title: 'User Experience Research Project',
        description: 'Conducted comprehensive user research study that led to 25% improvement in user satisfaction and informed product roadmap decisions.',
        fullContent: `# User Experience Research Project

## Research Objectives
Understand user pain points and identify opportunities for improving the overall user experience.

## Methodology
- User interviews (30 participants)
- Usability testing sessions
- Analytics data analysis
- Competitive analysis
- Survey data collection

## Key Findings
- Users struggled with navigation complexity
- Mobile experience needed significant improvements
- Checkout process had high abandonment rates
- Users wanted more personalization options

## Recommendations
1. Simplify navigation structure
2. Implement mobile-first design
3. Streamline checkout process
4. Add personalization features

## Impact
- 25% improvement in user satisfaction scores
- 20% increase in task completion rates
- 15% reduction in support tickets
- Direct influence on product roadmap priorities`,
        abstractContent: 'Conducted comprehensive user research study that led to 25% improvement in user satisfaction and informed product roadmap decisions.',
        visibility: 'network',
        isPublished: true,
        category: 'Research',
        tags: ['user-research', 'ux', 'product-strategy'],
        skills: ['UX Research', 'User Testing', 'Data Analysis', 'Product Strategy']
      },
      {
        title: 'Test Automation Framework Implementation',
        description: 'Built comprehensive test automation framework that reduced manual testing time by 60% and improved release confidence.',
        fullContent: `# Test Automation Framework Implementation

## Project Goal
Implement a robust test automation framework to improve testing efficiency and release quality.

## Framework Components
- End-to-end testing suite
- API testing automation
- Visual regression testing
- Performance testing integration
- CI/CD pipeline integration

## Technical Implementation
- Playwright for browser automation
- Jest for unit and integration tests
- Custom reporting dashboard
- Parallel test execution
- Cross-browser compatibility testing

## Results
- 60% reduction in manual testing time
- 40% faster release cycles
- Improved bug detection rate
- Higher confidence in releases
- Better test coverage metrics

## Key Features
- Automated test data management
- Screenshot comparison
- Performance monitoring
- Integration with monitoring tools
- Detailed reporting and analytics`,
        abstractContent: 'Built comprehensive test automation framework that reduced manual testing time by 60% and improved release confidence.',
        visibility: 'workspace',
        isPublished: false,
        category: 'Quality Assurance',
        tags: ['testing', 'automation', 'quality-assurance'],
        skills: ['Test Automation', 'Playwright', 'Jest', 'CI/CD', 'Quality Assurance']
      }
    ];

    // Create journal entries
    for (const entry of entries) {
      await prisma.journalEntry.create({
        data: {
          ...entry,
          authorId: user.id,
          workspaceId: workspace.id,
          publishedAt: entry.isPublished ? new Date() : null
        }
      });
    }

    console.log('Created', entries.length, 'sample journal entries');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating sample entries:', error);
  }
}

createSampleEntries();