const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Complete skills list from seed-reference-data.ts
const allSkills = [
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

async function seedAllSkills() {
  console.log('🌱 Starting complete skills seeding...');
  console.log(`📊 Total skills to seed: ${allSkills.length}`);

  try {
    // Use createMany with skipDuplicates for fast batch insert
    const result = await prisma.skill.createMany({
      data: allSkills,
      skipDuplicates: true
    });

    console.log(`✅ Successfully seeded ${result.count} new skills`);

    // Get final count
    const totalCount = await prisma.skill.count();
    console.log(`📈 Total skills in database: ${totalCount}`);

  } catch (error) {
    console.error('❌ Error seeding skills:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAllSkills();
